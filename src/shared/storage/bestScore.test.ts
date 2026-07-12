import { describe, expect, it, beforeEach } from 'vitest';
import { loadBest, saveBest, updateBestIfHigher } from './bestScore';

const KEY = 'test-codecup-best';

describe('bestScore storage', () => {
  beforeEach(() => {
    localStorage.removeItem(KEY);
  });

  it('loads 0 when empty', () => {
    expect(loadBest(KEY)).toBe(0);
  });

  it('saves and loads', () => {
    saveBest(KEY, 42);
    expect(loadBest(KEY)).toBe(42);
  });

  it('updateBestIfHigher only when higher', () => {
    saveBest(KEY, 50);
    expect(updateBestIfHigher(KEY, 40)).toEqual({ best: 50, isNewBest: false });
    expect(updateBestIfHigher(KEY, 80)).toEqual({ best: 80, isNewBest: true });
    expect(loadBest(KEY)).toBe(80);
  });
});
