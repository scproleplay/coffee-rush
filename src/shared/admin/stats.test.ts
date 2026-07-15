import { describe, expect, it, vi, beforeEach } from 'vitest';

const getSupabase = vi.fn();
const isSupabaseConfigured = vi.fn();

vi.mock('../supabase/client', () => ({
  getSupabase: () => getSupabase(),
}));

vi.mock('../config/env', () => ({
  isSupabaseConfigured: () => isSupabaseConfigured(),
}));

import {
  adminStatsErrorMessage,
  AdminStatsError,
  fetchAdminOverview,
  formatAdminTimestamp,
} from './stats';

type QueryResult = { count?: number | null; data?: unknown; error: unknown };

/**
 * Mock chain covering:
 * - count head selects (+ optional .eq / .not)
 * - nickname list select
 * - highest CE score (order/limit/maybeSingle)
 * - recent rows (order/limit)
 */
function mockOverviewClient(opts: {
  totalScores: number;
  nicknames: string[];
  coffeeEscapeCount: number;
  highestCe: number | null;
  recent: unknown[];
  fail?: boolean;
}) {
  const from = vi.fn((_table: string) => {
    if (opts.fail) {
      return {
        select: () =>
          Promise.resolve({ count: null, data: null, error: { message: 'relation missing' } }),
      };
    }

    return {
      select: (cols?: string, selectOpts?: { head?: boolean }) => {
        // Head count queries
        if (selectOpts?.head) {
          const chain: Record<string, unknown> = {
            eq: (_col: string, val: string) => {
              if (val === 'coffee-escape') {
                return Promise.resolve({ count: opts.coffeeEscapeCount, error: null });
              }
              return Promise.resolve({ count: 0, error: null });
            },
            then: (resolve: (v: QueryResult) => void, reject?: (e: unknown) => void) =>
              Promise.resolve({ count: opts.totalScores, error: null }).then(resolve, reject),
          };
          return chain;
        }

        // Nickname-only select for unique count
        if (cols === 'nickname') {
          return Promise.resolve({
            data: opts.nicknames.map((nickname) => ({ nickname })),
            error: null,
          });
        }

        // score select for highest CE — chain: .eq().not().order().limit().maybeSingle()
        if (cols === 'score') {
          return {
            eq: () => ({
              not: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: () =>
                      Promise.resolve({
                        data:
                          opts.highestCe == null ? null : { score: opts.highestCe },
                        error: null,
                      }),
                  }),
                }),
              }),
            }),
          };
        }

        // Recent submissions select *
        return {
          order: () => ({
            limit: () => Promise.resolve({ data: opts.recent, error: null }),
          }),
        };
      },
    };
  });

  getSupabase.mockReturnValue({ from });
  return { from };
}

describe('fetchAdminOverview', () => {
  beforeEach(() => {
    getSupabase.mockReset();
    isSupabaseConfigured.mockReset();
    isSupabaseConfigured.mockReturnValue(true);
  });

  it('returns not_configured when env missing', async () => {
    isSupabaseConfigured.mockReturnValue(false);
    const { data, error } = await fetchAdminOverview();
    expect(data).toBeNull();
    expect(error?.code).toBe('not_configured');
  });

  it('returns not_configured when client is null', async () => {
    getSupabase.mockReturnValue(null);
    const { data, error } = await fetchAdminOverview();
    expect(data).toBeNull();
    expect(error?.code).toBe('not_configured');
  });

  it('loads required dashboard cards and recent rows', async () => {
    mockOverviewClient({
      totalScores: 100,
      nicknames: ['Ace', 'ace', 'Bee', '  Bee  ', ''],
      coffeeEscapeCount: 15,
      highestCe: 4200,
      recent: [
        {
          id: '1',
          game: 'coffee-escape',
          nickname: 'Ace',
          score: 900,
          user_id: 'uid-1',
          created_at: '2026-07-15T12:00:00.000Z',
        },
        {
          id: '2',
          game: 'reaction-timer',
          nickname: 'Bee',
          reaction_time: 210,
          user_id: null,
          created_at: '2026-07-15T11:00:00.000Z',
        },
      ],
    });

    const { data, error } = await fetchAdminOverview();
    expect(error).toBeNull();
    expect(data?.totalScores).toBe(100);
    // Ace/ace + Bee/Bee → 2 unique
    expect(data?.uniqueNicknames).toBe(2);
    expect(data?.coffeeEscapeScores).toBe(15);
    expect(data?.highestCoffeeEscapeScore).toBe(4200);
    expect(data?.recent).toHaveLength(2);
    expect(data?.recent[0]?.nickname).toBe('Ace');
    expect(data?.recent[0]?.valueLabel).toBe('900');
    expect(data?.recent[0]?.hasUserId).toBe(true);
    expect(data?.recent[1]?.valueLabel).toBe('210 ms');
    expect(data?.recent[1]?.hasUserId).toBe(false);
  });

  it('maps server errors to AdminStatsError', async () => {
    mockOverviewClient({
      totalScores: 0,
      nicknames: [],
      coffeeEscapeCount: 0,
      highestCe: null,
      recent: [],
      fail: true,
    });
    const { data, error } = await fetchAdminOverview();
    expect(data).toBeNull();
    expect(error?.code).toBe('server');
  });
});

describe('adminStatsErrorMessage', () => {
  it('uses friendly copy for known codes', () => {
    expect(adminStatsErrorMessage(new AdminStatsError('network', 'x'))).toContain('reach Supabase');
    expect(adminStatsErrorMessage(new AdminStatsError('not_configured', 'x'))).toContain(
      'not configured',
    );
    expect(adminStatsErrorMessage(new Error('nope'))).toContain('Could not load');
  });
});

describe('formatAdminTimestamp', () => {
  it('returns dash for empty/invalid', () => {
    expect(formatAdminTimestamp(null)).toBe('—');
    expect(formatAdminTimestamp('not-a-date')).toBe('—');
  });

  it('formats valid ISO strings', () => {
    const out = formatAdminTimestamp('2026-07-15T12:30:00.000Z');
    expect(out).not.toBe('—');
    expect(out.length).toBeGreaterThan(3);
  });
});
