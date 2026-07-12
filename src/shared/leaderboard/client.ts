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

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
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

export async function fetchTop100(game: LeaderboardGameId): Promise<{
  data: ScoreRow[];
  error: Error | null;
}> {
  try {
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
    if (error) return { data: [], error: new Error(error.message) };
    return { data: (data as ScoreRow[]) || [], error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function submitScore(payload: SubmitScorePayload): Promise<{
  ok: boolean;
  error: Error | null;
}> {
  try {
    const nickname = (payload.nickname || '').trim();
    if (nickname.length < 1 || nickname.length > 12) {
      return { ok: false, error: new Error('Nickname must be 1–12 characters.') };
    }
    const row: ScoreRow = {
      game: payload.game,
      nickname,
    };
    if (typeof payload.score === 'number' && Number.isFinite(payload.score)) row.score = payload.score;
    if (typeof payload.reactionTime === 'number' && Number.isFinite(payload.reactionTime)) {
      row.reaction_time = payload.reactionTime;
    }
    if (typeof payload.moves === 'number' && Number.isFinite(payload.moves)) row.moves = payload.moves;
    if (typeof payload.timeSeconds === 'number' && Number.isFinite(payload.timeSeconds)) {
      row.time_seconds = payload.timeSeconds;
    }
    if (payload.userId) row.user_id = payload.userId;

    const sb = getClient();
    const { error } = await sb.from('leaderboard_scores').insert([row]);
    if (error) return { ok: false, error: new Error(error.message) };
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
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
    const moves = row.moves == null ? '—' : `${row.moves} ${row.moves === 1 ? 'move' : 'moves'}`;
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
