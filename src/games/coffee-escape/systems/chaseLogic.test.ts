import { describe, expect, it } from 'vitest';
import {
  applyChaseBeanRelief,
  applyChaseHit,
  chaseProximity,
  createChaseState,
  isCaught,
  manZFromDanger,
  tickChase,
} from './chaseLogic';
import {
  CHASE_BEAN_RELIEF,
  CHASE_HIT_DANGER,
  CHASE_MAN_Z_FAR,
  CHASE_MAN_Z_NEAR,
  CHASE_MAX,
} from '../engine/constants';

describe('createChaseState', () => {
  it('starts safe', () => {
    const c = createChaseState();
    expect(c.danger).toBe(0);
    expect(c.max).toBe(CHASE_MAX);
    expect(isCaught(c)).toBe(false);
  });
});

describe('applyChaseHit', () => {
  it('raises danger and sets i-frames', () => {
    const c = applyChaseHit(createChaseState())!;
    expect(c.danger).toBe(CHASE_HIT_DANGER);
    expect(c.hitIFrame).toBeGreaterThan(0);
  });

  it('ignores hits during i-frames', () => {
    const once = applyChaseHit(createChaseState())!;
    expect(applyChaseHit(once)).toBeNull();
  });

  it('can catch after enough hits', () => {
    let c = createChaseState();
    // Bypass i-frames between hits
    for (let i = 0; i < 5; i++) {
      c = { ...c, hitIFrame: 0 };
      const next = applyChaseHit(c);
      if (next) c = next;
    }
    expect(c.danger).toBe(CHASE_MAX);
    expect(isCaught(c)).toBe(true);
  });
});

describe('applyChaseBeanRelief / boost drain', () => {
  it('beans lower danger', () => {
    const hot = { ...createChaseState(), danger: 40 };
    const cooled = applyChaseBeanRelief(hot);
    expect(cooled.danger).toBe(40 - CHASE_BEAN_RELIEF);
  });

  it('boost drains danger over time', () => {
    const hot = { ...createChaseState(), danger: 50 };
    const after = tickChase(hot, 1, { boostActive: true });
    expect(after.danger).toBeLessThan(50);
  });

  it('passive creep raises danger slowly when not boosting', () => {
    const c = createChaseState();
    const after = tickChase(c, 2, { boostActive: false });
    expect(after.danger).toBeGreaterThan(0);
    expect(after.danger).toBeLessThan(10);
  });
});

describe('manZFromDanger / proximity', () => {
  it('maps far→near as danger rises but stays behind camera plane', () => {
    expect(manZFromDanger(0)).toBeCloseTo(CHASE_MAN_Z_FAR, 5);
    expect(manZFromDanger(CHASE_MAX)).toBeCloseTo(CHASE_MAN_Z_NEAR, 5);
    expect(manZFromDanger(CHASE_MAX / 2)).toBeLessThan(CHASE_MAN_Z_FAR);
    expect(manZFromDanger(CHASE_MAX / 2)).toBeGreaterThan(CHASE_MAN_Z_NEAR);
    // Must stay in front of the camera (camera ~z=4.5 looking toward -Z)
    expect(CHASE_MAN_Z_FAR).toBeLessThan(4.2);
    expect(CHASE_MAN_Z_NEAR).toBeLessThan(CHASE_MAN_Z_FAR);
    expect(CHASE_MAN_Z_NEAR).toBeGreaterThan(1.2);
  });

  it('proximity is 0..1', () => {
    expect(chaseProximity({ danger: 0, max: 100 })).toBe(0);
    expect(chaseProximity({ danger: 50, max: 100 })).toBeCloseTo(0.5, 5);
    expect(chaseProximity({ danger: 100, max: 100 })).toBe(1);
  });
});
