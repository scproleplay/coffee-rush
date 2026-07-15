import { describe, expect, it } from 'vitest';
import { isNewBest, pickGameOverTitle } from './gameFlow';

describe('pickGameOverTitle', () => {
  it('tiers by score with house-chase copy', () => {
    expect(pickGameOverTitle(0)).toMatch(/Caught|house/i);
    expect(pickGameOverTitle(50)).toMatch(/almost had you|Caught/i);
    expect(pickGameOverTitle(100)).toMatch(/free|Almost/i);
    expect(pickGameOverTitle(200)).toMatch(/legend|House/i);
  });
});

describe('isNewBest', () => {
  it('strictly greater', () => {
    expect(isNewBest(10, 10)).toBe(false);
    expect(isNewBest(11, 10)).toBe(true);
  });
});
