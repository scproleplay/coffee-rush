import { describe, expect, it } from 'vitest';
import { isNewBest, pickGameOverTitle } from './gameFlow';

describe('pickGameOverTitle', () => {
  it('tiers by score', () => {
    expect(pickGameOverTitle(0)).toContain('Spat');
    expect(pickGameOverTitle(50)).toContain('Caught');
    expect(pickGameOverTitle(100)).toContain('brew-tal');
    expect(pickGameOverTitle(200)).toContain('Legendary');
  });
});

describe('isNewBest', () => {
  it('strictly greater', () => {
    expect(isNewBest(10, 10)).toBe(false);
    expect(isNewBest(11, 10)).toBe(true);
  });
});
