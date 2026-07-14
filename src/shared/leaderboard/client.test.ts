import { describe, expect, it } from 'vitest';
import { leaderboardErrorMessage, LeaderboardError, validateNickname } from './client';

describe('validateNickname', () => {
  it('accepts valid nicks', () => {
    expect(validateNickname('  Ace_1  ')).toEqual({ ok: true, nickname: 'Ace_1' });
    expect(validateNickname('A')).toEqual({ ok: true, nickname: 'A' });
  });

  it('rejects empty, long, or illegal chars', () => {
    expect(validateNickname('').ok).toBe(false);
    expect(validateNickname('abcdefghijklm').ok).toBe(false);
    expect(validateNickname('bad@nick').ok).toBe(false);
    expect(validateNickname('hi!').ok).toBe(false);
  });
});

describe('leaderboardErrorMessage', () => {
  it('hides raw fetch/TypeError text', () => {
    expect(leaderboardErrorMessage(new TypeError('Failed to fetch'))).toContain(
      'Local scores still work',
    );
    expect(
      leaderboardErrorMessage(new LeaderboardError('network', 'Failed to fetch')),
    ).toContain('Local scores still work');
  });

  it('keeps validation messages', () => {
    expect(
      leaderboardErrorMessage(new LeaderboardError('validation', 'Nickname must be 1–12 characters.')),
    ).toBe('Nickname must be 1–12 characters.');
  });
});
