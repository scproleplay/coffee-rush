/**
 * Auth & identity contracts — designed so login can land without rewriting games.
 * Phase A: guest sessions (nickname only).
 * Phase B: Supabase Auth user + profile.
 */

export type UserId = string;

export interface GuestIdentity {
  kind: 'guest';
  nickname: string;
}

export interface RegisteredIdentity {
  kind: 'user';
  userId: UserId;
  email?: string;
  nickname: string;
  avatarUrl?: string;
}

export type Identity = GuestIdentity | RegisteredIdentity;

export interface Profile {
  userId: UserId;
  nickname: string;
  avatarUrl?: string;
  createdAt: string;
}

/** Future-facing session API every game / shell feature should use. */
export interface AuthSession {
  identity: Identity | null;
  /** true once Supabase Auth is wired and a session exists */
  isAuthenticated: boolean;
  /** placeholder for Phase B */
  accessToken?: string;
}
