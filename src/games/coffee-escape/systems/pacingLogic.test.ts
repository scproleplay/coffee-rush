import { describe, expect, it } from 'vitest';
import {
  nextBeanDelay,
  scoreFromTime,
  speedAtTime,
  startBoost,
  tickBoost,
} from './pacingLogic';
import {
  BASE_SPEED,
  MAX_SPEED,
  SCORE_PER_SECOND,
  SPEED_GRACE_SECONDS,
} from '../engine/constants';

describe('speedAtTime', () => {
  it('stays at base during grace', () => {
    expect(speedAtTime(0)).toBe(BASE_SPEED);
    expect(speedAtTime(SPEED_GRACE_SECONDS)).toBe(BASE_SPEED);
  });

  it('ramps after grace and caps at max', () => {
    expect(speedAtTime(SPEED_GRACE_SECONDS + 10)).toBeGreaterThan(BASE_SPEED);
    expect(speedAtTime(999)).toBe(MAX_SPEED);
  });
});

describe('scoreFromTime', () => {
  it('floors worldTime * rate', () => {
    expect(scoreFromTime(0)).toBe(0);
    expect(scoreFromTime(1.2)).toBe(Math.floor(1.2 * SCORE_PER_SECOND));
  });
});

describe('tickBoost', () => {
  it('fills meter when inactive', () => {
    const r = tickBoost(
      { active: false, timer: 0, meter: 0, max: 100, cost: 30, duration: 1.5 },
      1,
    );
    expect(r.active).toBe(false);
    expect(r.meter).toBeCloseTo(100 / 7, 5);
    expect(r.justEnded).toBe(false);
  });

  it('counts down and ends boost', () => {
    const mid = tickBoost(
      { active: true, timer: 0.5, meter: 50, max: 100, cost: 30, duration: 1.5 },
      0.2,
    );
    expect(mid.active).toBe(true);
    expect(mid.timer).toBeCloseTo(0.3, 5);

    const end = tickBoost(
      { active: true, timer: 0.1, meter: 50, max: 100, cost: 30, duration: 1.5 },
      0.2,
    );
    expect(end.active).toBe(false);
    expect(end.meter).toBe(0);
    expect(end.justEnded).toBe(true);
  });

  it('keeps meter at least at cost while active', () => {
    const r = tickBoost(
      { active: true, timer: 1, meter: 10, max: 100, cost: 30, duration: 1.5 },
      0.01,
    );
    expect(r.meter).toBe(30);
  });
});

describe('startBoost', () => {
  it('requires meter and inactive', () => {
    expect(startBoost({ active: false, meter: 40, cost: 30, duration: 1.5 })).toEqual({
      active: true,
      timer: 1.5,
    });
    expect(startBoost({ active: false, meter: 10, cost: 30, duration: 1.5 })).toBeNull();
    expect(startBoost({ active: true, meter: 100, cost: 30, duration: 1.5 })).toBeNull();
  });
});

describe('nextBeanDelay', () => {
  it('stays within min..max', () => {
    expect(nextBeanDelay(2, 4, () => 0)).toBe(2);
    expect(nextBeanDelay(2, 4, () => 1)).toBe(4);
    expect(nextBeanDelay(2, 4, () => 0.5)).toBe(3);
  });
});
