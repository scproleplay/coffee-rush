import { describe, expect, it } from 'vitest';
import {
  isNewBest,
  pickGameOverBlurb,
  pickGameOverTitle,
} from './gameFlow';

describe('pickGameOverTitle', () => {
  it('tiers by score with house-chase copy', () => {
    expect(pickGameOverTitle(0)).toMatch(/kitchen|Back/i);
    expect(pickGameOverTitle(40)).toMatch(/Close call/i);
    expect(pickGameOverTitle(80)).toMatch(/free|Almost/i);
    expect(pickGameOverTitle(150)).toMatch(/Outran|house/i);
    expect(pickGameOverTitle(250)).toMatch(/legend|House/i);
  });

  it('uses catch copy when the chase meter maxes', () => {
    expect(pickGameOverTitle(50, 'caught')).toMatch(/caught his coffee/i);
    expect(pickGameOverTitle(250, 'caught')).toMatch(/caught his coffee/i);
  });
});

describe('pickGameOverBlurb', () => {
  it('coaches on catch', () => {
    expect(pickGameOverBlurb(10, 'caught')).toMatch(/chase meter/i);
  });

  it('celebrates big scores', () => {
    expect(pickGameOverBlurb(300)).toMatch(/Submit|house/i);
  });
});

describe('isNewBest', () => {
  it('strictly greater than previous best only', () => {
    expect(isNewBest(10, 10)).toBe(false);
    expect(isNewBest(11, 10)).toBe(true);
    expect(isNewBest(133, 390)).toBe(false);
    expect(isNewBest(391, 390)).toBe(true);
    expect(isNewBest(0, 0)).toBe(false);
    expect(isNewBest(1, 0)).toBe(true);
  });
});
