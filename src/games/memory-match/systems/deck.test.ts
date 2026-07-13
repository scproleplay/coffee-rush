import { describe, expect, it } from 'vitest';
import {
  buildDeck,
  formatMs,
  isBetterMoves,
  isBetterTime,
  isMatch,
  shuffle,
} from './deck';

describe('memory-match deck', () => {
  it('builds 16 cards with pairs', () => {
    const deck = buildDeck(['a', 'b'], () => 0);
    expect(deck.length).toBe(4);
    expect(deck.filter((x) => x === 'a').length).toBe(2);
  });

  it('shuffle is deterministic with fixed rng', () => {
    const a = shuffle([1, 2, 3, 4], () => 0);
    expect(a).toEqual([2, 3, 4, 1]);
  });

  it('match + best helpers', () => {
    expect(isMatch('☕', '☕')).toBe(true);
    expect(isMatch('☕', '⚡')).toBe(false);
    expect(isBetterMoves(null, 10)).toBe(true);
    expect(isBetterMoves(12, 10)).toBe(true);
    expect(isBetterMoves(8, 10)).toBe(false);
    expect(isBetterTime(null, 1000)).toBe(true);
    expect(formatMs(65000)).toBe('01:05');
  });
});
