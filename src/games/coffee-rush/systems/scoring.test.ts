import { describe, expect, it } from 'vitest';
import { basePoints, nextCombo, rollGolden, totalPoints } from './scoring';

describe('coffee-rush scoring', () => {
  it('starts combo at 1 after gap', () => {
    expect(nextCombo(5, 0, 1000)).toBe(1);
    expect(nextCombo(5, 100, 2000)).toBe(1);
  });

  it('increments combo inside window', () => {
    expect(nextCombo(2, 1000, 1500)).toBe(3);
  });

  it('points multiply by combo', () => {
    expect(basePoints(false)).toBe(1);
    expect(basePoints(true)).toBe(5);
    expect(totalPoints(false, 3)).toBe(3);
    expect(totalPoints(true, 2)).toBe(10);
  });

  it('rollGolden uses chance + rng', () => {
    expect(rollGolden(0.25, () => 0.1)).toBe(true);
    expect(rollGolden(0.25, () => 0.9)).toBe(false);
  });
});
