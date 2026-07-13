import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig, isSupabaseConfigured } from '../config/env';
import type { GameId } from '../config/games';

export type LeaderboardGameId = GameId;

export interface ScoreRow {
  id?: string;
  game: LeaderboardGameId;
  nickname: string;
  score?: number | null;
  reaction_time?: number | null;
  moves?: number | null;
  time_seconds?: number | null;
  user_id?: string | null;
  created_at?: string;
}

export interface SubmitScorePayload {
  game: LeaderboardGameId;
  nickname: string;
  score?: number;
  reactionTime?: number;
  moves?: number;
  timeSeconds?: number;
  /** Phase B: attach authenticated user */
  userId?: string;
}

export type LeaderboardErrorCode =
  | 'not_configured'
  | 'network'
  | 'server'
  | 'validation';

export class LeaderboardError extends Error {
  readonly code: LeaderboardErrorCode;

  constructor(code: LeaderboardErrorCode, message: string) {
    super(message);
    this.name = 'LeaderboardError';
    this.code = code;
  }
}

/** Stable user-facing copy when the cloud leaderboard cannot be reached. */
export const LEADERBOARD_UNAVAILABLE_MSG =
  'Online leaderboards are temporarily unavailable. Local scores still work.';

/** User-facing copy for leaderboard failures (shell + games). Never surface raw TypeErrors. */
export function leaderboardErrorMessage(err: unknown): string {
  if (err instanceof LeaderboardError) {
    switch (err.code) {
      case 'not_configured':
        return LEADERBOARD_UNAVAILABLE_MSG;
      case 'network':
        return LEADERBOARD_UNAVAILABLE_MSG;
      case 'validation':
        // Keep validation specific (nickname rules, etc.)
        return err.message;
      case 'server':
        return LEADERBOARD_UNAVAILABLE_MSG;
      default:
        return LEADERBOARD_UNAVAILABLE_MSG;
    }
  }
  if (err instanceof Error && err.message) {
    const m = err.message.toLowerCase();
    if (
      m.includes('fetch') ||
      m.includes('network') ||
      m.includes('failed to fetch') ||
      m.includes('typeerror') ||
      m.includes('load failed') ||
      m.includes('supabase')
    ) {
      return LEADERBOARD_UNAVAILABLE_MSG;
    }
    // Avoid leaking raw exception text to players
    return LEADERBOARD_UNAVAILABLE_MSG;
  }
  return LEADERBOARD_UNAVAILABLE_MSG;
}

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  if (!isSupabaseConfigured()) {
    throw new LeaderboardError(
      'not_configured',
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (local .env and Vercel project env).',
    );
  }
  const { url, anonKey } = getSupabaseConfig();
  client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}

function getSort(game: LeaderboardGameId): {
  column: string;
  ascending: boolean;
  secondary?: { column: string; ascending: boolean };
  nullsFilter?: string;
} {
  switch (game) {
    case 'coffee-rush':
    case 'math-rush':
    case 'coffee-escape':
      return { column: 'score', ascending: false };
    case 'reaction-timer':
      return { column: 'reaction_time', ascending: true, nullsFilter: 'reaction_time' };
    case 'memory-match':
      return {
        column: 'moves',
        ascending: true,
        secondary: { column: 'time_seconds', ascending: true },
      };
    default:
      return { column: 'score', ascending: false };
  }
}

function toLeaderboardError(err: unknown): LeaderboardError {
  if (err instanceof LeaderboardError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('load failed') ||
    lower.includes('fetch')
  ) {
    return new LeaderboardError('network', msg);
  }
  return new LeaderboardError('server', msg || 'Leaderboard request failed.');
}

export async function fetchTop100(game: LeaderboardGameId): Promise<{
  data: ScoreRow[];
  error: LeaderboardError | null;
}> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        data: [],
        error: new LeaderboardError(
          'not_configured',
          'Supabase env vars missing in this build.',
        ),
      };
    }
    const sort = getSort(game);
    const sb = getClient();
    let query = sb.from('leaderboard_scores').select('*').eq('game', game).limit(100);
    if (sort.nullsFilter) {
      query = query.not(sort.nullsFilter, 'is', null);
    }
    query = query.order(sort.column, { ascending: sort.ascending });
    if (sort.secondary) {
      query = query.order(sort.secondary.column, { ascending: sort.secondary.ascending });
    }
    const { data, error } = await query;
    if (error) {
      return { data: [], error: new LeaderboardError('server', error.message) };
    }
    return { data: (data as ScoreRow[]) || [], error: null };
  } catch (err) {
    return { data: [], error: toLeaderboardError(err) };
  }
}

export async function submitScore(payload: SubmitScorePayload): Promise<{
  ok: boolean;
  error: LeaderboardError | null;
}> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        ok: false,
        error: new LeaderboardError(
          'not_configured',
          'Supabase env vars missing in this build.',
        ),
      };
    }
    const nickname = (payload.nickname || '').trim();
    if (nickname.length < 1 || nickname.length > 12) {
      return {
        ok: false,
        error: new LeaderboardError('validation', 'Nickname must be 1–12 characters.'),
      };
    }
    const row: ScoreRow = {
      game: payload.game,
      nickname,
    };
    if (typeof payload.score === 'number' && Number.isFinite(payload.score)) {
      row.score = payload.score;
    }
    if (typeof payload.reactionTime === 'number' && Number.isFinite(payload.reactionTime)) {
      row.reaction_time = payload.reactionTime;
    }
    if (typeof payload.moves === 'number' && Number.isFinite(payload.moves)) {
      row.moves = payload.moves;
    }
    if (typeof payload.timeSeconds === 'number' && Number.isFinite(payload.timeSeconds)) {
      row.time_seconds = payload.timeSeconds;
    }
    if (payload.userId) row.user_id = payload.userId;

    const sb = getClient();
    const { error } = await sb.from('leaderboard_scores').insert([row]);
    if (error) {
      return { ok: false, error: new LeaderboardError('server', error.message) };
    }
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: toLeaderboardError(err) };
  }
}

export function formatGameValue(game: LeaderboardGameId, row: ScoreRow): string {
  if (game === 'coffee-rush' || game === 'math-rush' || game === 'coffee-escape') {
    return row.score == null ? '—' : String(row.score);
  }
  if (game === 'reaction-timer') {
    return row.reaction_time == null ? '—' : `${row.reaction_time} ms`;
  }
  if (game === 'memory-match') {
    const moves =
      row.moves == null ? '—' : `${row.moves} ${row.moves === 1 ? 'move' : 'moves'}`;
    const t =
      row.time_seconds == null ? '' : ` · ${formatTimeSeconds(row.time_seconds)}`;
    return moves + t;
  }
  return '—';
}

function formatTimeSeconds(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}
