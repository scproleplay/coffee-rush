import type {
  AdminRole,
  AuthSession,
  GuestIdentity,
  Identity,
  Profile,
  RegisteredIdentity,
} from './types';
import { getSupabase } from '../supabase/client';
import { validateNickname } from './nickname';
import { fetchAdminRole } from './admin';

const GUEST_NICK_KEY = 'codecup-guest-nickname';

let current: AuthSession = {
  identity: null,
  isAuthenticated: false,
  adminRole: null,
};

let initPromise: Promise<AuthSession> | null = null;
const listeners = new Set<(s: AuthSession) => void>();

function emit(): void {
  for (const fn of listeners) {
    try {
      fn(current);
    } catch {
      /* ignore */
    }
  }
}

function setSession(next: AuthSession): void {
  current = next;
  emit();
}

export function getSession(): AuthSession {
  return current;
}

export function getIdentity(): Identity | null {
  return current.identity;
}

/** Subscribe to auth/session changes (profile UI). */
export function onSessionChange(fn: (s: AuthSession) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function loadGuestNickname(): string {
  try {
    return (localStorage.getItem(GUEST_NICK_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function saveGuestNickname(nickname: string): GuestIdentity {
  const check = validateNickname(nickname);
  const nick = check.ok ? check.nickname : nickname.trim().slice(0, 12);
  try {
    localStorage.setItem(GUEST_NICK_KEY, nick);
  } catch {
    /* ignore */
  }
  // If logged in, keep cloud identity; only update local guest store.
  if (current.isAuthenticated && current.identity?.kind === 'user') {
    return { kind: 'guest', nickname: nick };
  }
  const identity: GuestIdentity = { kind: 'guest', nickname: nick };
  setSession({ identity, isAuthenticated: false, adminRole: null });
  return identity;
}

/** Best nickname for leaderboard forms: profile nick, else guest. */
export function getPreferredNickname(): string {
  const id = current.identity;
  if (id?.nickname) return id.nickname;
  return loadGuestNickname();
}

/** Logged-in user id for score attach, else undefined. */
export function getUserIdForScore(): string | undefined {
  if (current.isAuthenticated && current.identity?.kind === 'user') {
    return current.identity.userId;
  }
  return undefined;
}

/** True only when signed in and admin_users has a row for this user_id. */
export function isAdmin(): boolean {
  return Boolean(current.isAuthenticated && current.adminRole);
}

export function getAdminRole(): AdminRole | null {
  if (!current.isAuthenticated) return null;
  return current.adminRole ?? null;
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('profiles')
    .select('id, nickname, created_at')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    userId: data.id as string,
    nickname: (data.nickname as string) || '',
    createdAt: data.created_at as string | undefined,
  };
}

function seedNickname(guest: string, email?: string | null): string {
  const fromGuest = validateNickname(guest);
  if (fromGuest.ok) return fromGuest.nickname;
  const fromEmail = email?.split('@')[0]?.slice(0, 12) || '';
  const fromEmailCheck = validateNickname(fromEmail);
  if (fromEmailCheck.ok) return fromEmailCheck.nickname;
  return 'Player';
}

async function ensureProfile(
  userId: string,
  email?: string | null,
): Promise<RegisteredIdentity> {
  const guest = loadGuestNickname();
  let profile = await fetchProfile(userId);
  const sb = getSupabase();

  if (!profile && sb) {
    const nick = seedNickname(guest, email);
    await sb.from('profiles').upsert({ id: userId, nickname: nick }, { onConflict: 'id' });
    profile = await fetchProfile(userId);
  }

  const nickname = profile?.nickname || seedNickname(guest, email);

  return {
    kind: 'user',
    userId,
    email: email || undefined,
    nickname,
  };
}

async function applyUser(user: {
  id: string;
  email?: string | null;
} | null): Promise<AuthSession> {
  if (!user) {
    const nick = loadGuestNickname();
    const session: AuthSession = {
      identity: nick ? { kind: 'guest', nickname: nick } : null,
      isAuthenticated: false,
      adminRole: null,
    };
    setSession(session);
    return session;
  }
  const identity = await ensureProfile(user.id, user.email);
  // Keep local guest nick in sync for game prefills
  if (identity.nickname) {
    try {
      localStorage.setItem(GUEST_NICK_KEY, identity.nickname);
    } catch {
      /* ignore */
    }
  }
  // Admin only from admin_users by auth uid — fail closed on errors.
  const adminRole = await fetchAdminRole(user.id);
  const session: AuthSession = {
    identity,
    isAuthenticated: true,
    adminRole,
  };
  setSession(session);
  return session;
}

/**
 * Init auth once. Safe if Supabase is offline — falls back to guest.
 */
export async function initAuth(): Promise<AuthSession> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const nick = loadGuestNickname();
    if (nick) {
      setSession({
        identity: { kind: 'guest', nickname: nick },
        isAuthenticated: false,
        adminRole: null,
      });
    }

    const sb = getSupabase();
    if (!sb) return current;

    try {
      const { data } = await sb.auth.getSession();
      await applyUser(data.session?.user ?? null);

      sb.auth.onAuthStateChange((_event, session) => {
        void applyUser(session?.user ?? null);
      });
    } catch {
      // Stay guest
    }
    return current;
  })();
  return initPromise;
}

/** Send magic link email. Redirects back to /profile/ */
export async function signInWithMagicLink(email: string): Promise<{ ok: boolean; message: string }> {
  const sb = getSupabase();
  if (!sb) {
    return {
      ok: false,
      message: 'Login is offline right now. You can still play as a guest.',
    };
  }
  const trimmed = email.trim();
  if (!trimmed || !trimmed.includes('@')) {
    return { ok: false, message: 'Enter a valid email address.' };
  }
  const redirectTo = `${window.location.origin}/profile/`;
  const { error } = await sb.auth.signInWithOtp({
    email: trimmed,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  });
  if (error) {
    return {
      ok: false,
      message: 'Could not send login email. Try again in a moment.',
    };
  }
  return {
    ok: true,
    message: 'Check your email for the login link. You can keep playing as a guest meanwhile.',
  };
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.auth.signOut();
    } catch {
      /* ignore */
    }
  }
  const nick = loadGuestNickname();
  setSession({
    identity: nick ? { kind: 'guest', nickname: nick } : null,
    isAuthenticated: false,
    adminRole: null,
  });
}

/** Save nickname: guest localStorage and/or profiles row when logged in. */
export async function saveNickname(raw: string): Promise<{ ok: boolean; message: string }> {
  const check = validateNickname(raw);
  if (!check.ok) return { ok: false, message: check.message };
  const nick = check.nickname;

  saveGuestNickname(nick);

  if (current.isAuthenticated && current.identity?.kind === 'user') {
    const sb = getSupabase();
    if (!sb) {
      return { ok: true, message: `Saved locally as “${nick}”. Cloud save unavailable.` };
    }
    const { error } = await sb
      .from('profiles')
      .upsert({ id: current.identity.userId, nickname: nick }, { onConflict: 'id' });
    if (error) {
      return {
        ok: false,
        message: 'Could not save nickname to your account. Try again.',
      };
    }
    setSession({
      isAuthenticated: true,
      identity: { ...current.identity, nickname: nick },
      adminRole: current.adminRole ?? null,
    });
    return { ok: true, message: `Saved! You’re “${nick}” (signed in).` };
  }

  return { ok: true, message: `Saved! You’re “${nick}” (guest).` };
}
