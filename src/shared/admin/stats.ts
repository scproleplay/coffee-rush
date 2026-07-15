/**
 * Read-only admin dashboard data.
 * Access is gated in the shell via admin_users (auth user_id only).
 * No deletes, updates, or destructive actions.
 */
import { isSupabaseConfigured } from '../config/env';
import { getSupabase } from '../supabase/client';
import {
  formatGameValue,
  type LeaderboardGameId,
  type ScoreRow,
} from '../leaderboard/client';
import { GAMES, type GameId } from '../config/games';

export type AdminStatsErrorCode = 'not_configured' | 'network' | 'server' | 'forbidden';

export class AdminStatsError extends Error {
  readonly code: AdminStatsErrorCode;

  constructor(code: AdminStatsErrorCode, message: string) {
    super(message);
    this.name = 'AdminStatsError';
    this.code = code;
  }
}

export interface RecentScoreRow {
  id?: string;
  game: LeaderboardGameId;
  gameName: string;
  emoji: string;
  nickname: string;
  /** Formatted score / reaction / moves·time for this game */
  valueLabel: string;
  createdAt: string | null;
  /** Whether the row has a linked auth user_id */
  hasUserId: boolean;
}

export interface AdminOverview {
  totalScores: number;
  uniqueNicknames: number;
  coffeeEscapeScores: number;
  highestCoffeeEscapeScore: number | null;
  recent: RecentScoreRow[];
}

const RECENT_LIMIT = 10;
const COFFEE_ESCAPE: GameId = 'coffee-escape';

function toAdminError(err: unknown): AdminStatsError {
  if (err instanceof AdminStatsError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('load failed') ||
    lower.includes('fetch')
  ) {
    return new AdminStatsError('network', msg);
  }
  if (lower.includes('permission') || lower.includes('rls') || lower.includes('jwt')) {
    return new AdminStatsError('forbidden', msg);
  }
  return new AdminStatsError('server', msg || 'Admin stats request failed.');
}

export function adminStatsErrorMessage(err: unknown): string {
  if (err instanceof AdminStatsError) {
    switch (err.code) {
      case 'not_configured':
        return 'Supabase is not configured in this build.';
      case 'network':
        return 'Could not reach Supabase — try again in a moment.';
      case 'forbidden':
        return 'Could not load stats (access or RLS). Check your admin session.';
      default:
        return 'Could not load admin stats. Try again later.';
    }
  }
  return 'Could not load admin stats. Try again later.';
}

function gameMeta(game: string): { name: string; emoji: string; id: GameId | null } {
  const g = GAMES.find((x) => x.id === game);
  if (g) return { name: g.name, emoji: g.emoji, id: g.id };
  return { name: game || 'Unknown', emoji: '🎮', id: null };
}

function requireClient() {
  const sb = getSupabase();
  if (!sb) {
    throw new AdminStatsError('not_configured', 'Supabase is not configured.');
  }
  return sb;
}

async function countAllScores(): Promise<number> {
  const sb = requireClient();
  const { count, error } = await sb
    .from('leaderboard_scores')
    .select('*', { count: 'exact', head: true });
  if (error) throw new AdminStatsError('server', error.message);
  return count ?? 0;
}

/**
 * Unique nicknames across leaderboard_scores (case-insensitive trim).
 * Loads nickname column only — fine for arcade-scale tables.
 */
async function countUniqueNicknames(): Promise<number> {
  const sb = requireClient();
  const { data, error } = await sb.from('leaderboard_scores').select('nickname');
  if (error) throw new AdminStatsError('server', error.message);
  const set = new Set<string>();
  for (const row of data || []) {
    const nick = typeof row.nickname === 'string' ? row.nickname.trim().toLowerCase() : '';
    if (nick) set.add(nick);
  }
  return set.size;
}

async function countCoffeeEscapeScores(): Promise<number> {
  const sb = requireClient();
  const { count, error } = await sb
    .from('leaderboard_scores')
    .select('*', { count: 'exact', head: true })
    .eq('game', COFFEE_ESCAPE);
  if (error) throw new AdminStatsError('server', error.message);
  return count ?? 0;
}

async function fetchHighestCoffeeEscapeScore(): Promise<number | null> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('leaderboard_scores')
    .select('score')
    .eq('game', COFFEE_ESCAPE)
    .not('score', 'is', null)
    .order('score', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new AdminStatsError('server', error.message);
  if (!data || data.score == null) return null;
  const n = Number(data.score);
  return Number.isFinite(n) ? n : null;
}

async function fetchRecentScores(limit = RECENT_LIMIT): Promise<RecentScoreRow[]> {
  const sb = requireClient();
  const { data, error } = await sb
    .from('leaderboard_scores')
    .select(
      'id, game, nickname, score, reaction_time, moves, time_seconds, user_id, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new AdminStatsError('server', error.message);

  const rows = (data as ScoreRow[]) || [];
  return rows.map((row) => {
    const meta = gameMeta(row.game);
    const gameId = (meta.id ?? row.game) as LeaderboardGameId;
    return {
      id: row.id,
      game: gameId,
      gameName: meta.name,
      emoji: meta.emoji,
      nickname: row.nickname || '—',
      valueLabel: formatGameValue(gameId, row),
      createdAt: row.created_at ?? null,
      hasUserId: Boolean(row.user_id),
    };
  });
}

/**
 * Load read-only overview for the admin panel.
 * UI must only call this after isAdmin() (admin_users by auth uid).
 */
export async function fetchAdminOverview(): Promise<{
  data: AdminOverview | null;
  error: AdminStatsError | null;
}> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: new AdminStatsError('not_configured', 'Supabase env vars missing in this build.'),
      };
    }
    if (!getSupabase()) {
      return {
        data: null,
        error: new AdminStatsError('not_configured', 'Supabase client unavailable.'),
      };
    }

    const [
      totalScores,
      uniqueNicknames,
      coffeeEscapeScores,
      highestCoffeeEscapeScore,
      recent,
    ] = await Promise.all([
      countAllScores(),
      countUniqueNicknames(),
      countCoffeeEscapeScores(),
      fetchHighestCoffeeEscapeScore(),
      fetchRecentScores(),
    ]);

    return {
      data: {
        totalScores,
        uniqueNicknames,
        coffeeEscapeScores,
        highestCoffeeEscapeScore,
        recent,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: toAdminError(err) };
  }
}

/** Format ISO timestamp for admin list (local, short). */
export function formatAdminTimestamp(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  try {
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return d.toISOString().slice(0, 16).replace('T', ' ');
  }
}
