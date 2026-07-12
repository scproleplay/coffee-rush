import type { AuthSession, GuestIdentity, Identity } from './types';

const GUEST_NICK_KEY = 'codecup-guest-nickname';

let current: AuthSession = {
  identity: null,
  isAuthenticated: false,
};

export function getSession(): AuthSession {
  return current;
}

export function getIdentity(): Identity | null {
  return current.identity;
}

/** Guest nickname for leaderboard submit before full auth. */
export function loadGuestNickname(): string {
  try {
    return (localStorage.getItem(GUEST_NICK_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function saveGuestNickname(nickname: string): GuestIdentity {
  const nick = nickname.trim().slice(0, 12);
  try {
    localStorage.setItem(GUEST_NICK_KEY, nick);
  } catch {
    /* ignore */
  }
  const identity: GuestIdentity = { kind: 'guest', nickname: nick };
  current = {
    identity,
    isAuthenticated: false,
  };
  return identity;
}

/**
 * Phase B hook: replace body with Supabase auth.getSession() / onAuthStateChange.
 * Games already call getSession() — no game rewrites required.
 */
export async function initAuth(): Promise<AuthSession> {
  const nick = loadGuestNickname();
  if (nick) {
    current = {
      identity: { kind: 'guest', nickname: nick },
      isAuthenticated: false,
    };
  }
  return current;
}
