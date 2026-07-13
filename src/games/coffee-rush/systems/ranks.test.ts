import { describe, expect, it } from 'vitest';
import { rankFor } from './ranks';

describe('coffee-rush ranks', () => {
  it('maps score bands', () => {
    expect(rankFor(0).name).toBe('Beginner Sipper');
    expect(rankFor(500).name).toBe('Coffee Catcher');
    expect(rankFor(1500).name).toBe('Caffeine Pro');
    expect(rankFor(3000).name).toBe('Coffee Master');
    expect(rankFor(5000).name).toBe('Coffee Legend');
  });
});
