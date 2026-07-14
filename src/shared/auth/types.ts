/**
 * Auth & identity contracts.
 * Guest mode always works. Logged-in users add userId + cloud nickname.
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
  createdAt?: string;
}

export interface AuthSession {
  identity: Identity | null;
  isAuthenticated: boolean;
  accessToken?: string;
}
