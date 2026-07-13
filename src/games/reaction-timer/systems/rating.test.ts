import { describe, expect, it } from 'vitest';
import { formatMs, getRating, isNewBest, randomWaitMs } from './rating';

describe('reaction-timer rating', () => {
  it('formats and rates', () => {
    expect(formatMs(null)).toBe('—');
    expect(formatMs(180)).toBe('180 ms');
    expect(getRating(180)).toContain('Lightning');
    expect(getRating(300)).toContain('Very Fast');
    expect(getRating(400)).toContain('Good');
    expect(getRating(600)).toContain('Keep');
  });

  it('best is lower', () => {
    expect(isNewBest(null, 200)).toBe(true);
    expect(isNewBest(250, 200)).toBe(true);
    expect(isNewBest(180, 200)).toBe(false);
  });

  it('wait delay in range', () => {
    const d = randomWaitMs(2000, 5000, () => 0.5);
    expect(d).toBe(3500);
  });
});
