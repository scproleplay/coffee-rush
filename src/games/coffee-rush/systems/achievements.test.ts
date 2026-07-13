import { describe, expect, it } from 'vitest';
import { evaluateUnlocks, loadAchievementIds, serializeAchievements } from './achievements';

describe('coffee-rush achievements', () => {
  it('unlocks score tiers and golden hunter', () => {
    const got = evaluateUnlocks({ score: 500, goldenCups: 15 }, new Set());
    const ids = got.map((a) => a.id);
    expect(ids).toContain('first_sip');
    expect(ids).toContain('coffee_catcher');
    expect(ids).toContain('golden_hunter');
    expect(ids).not.toContain('caffeine_pro');
  });

  it('skips already unlocked', () => {
    const got = evaluateUnlocks(
      { score: 500, goldenCups: 0 },
      new Set(['first_sip', 'coffee_catcher']),
    );
    expect(got).toEqual([]);
  });

  it('round-trips storage', () => {
    const s = new Set(['first_sip']);
    const raw = serializeAchievements(s);
    expect(loadAchievementIds(raw)).toEqual(s);
    expect(loadAchievementIds(null).size).toBe(0);
  });
});
