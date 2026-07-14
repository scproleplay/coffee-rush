/**
 * Auth & identity contracts.
 * Guest mode always works. Logged-in users add userId + cloud nickname.
 * Admin role comes only from public.admin_users by auth user_id (never nickname/email).
 */

export type UserId = string;

/** Roles stored in public.admin_users.role */
export type AdminRole = 'owner' | 'admin';

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
  createdAt?: string;
}

export interface AuthSession {
  identity: Identity | null;
  isAuthenticated: boolean;
  accessToken?: string;
  /** Present only when signed in and a matching admin_users row exists. */
  adminRole?: AdminRole | null;
}
