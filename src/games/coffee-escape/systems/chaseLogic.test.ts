import { describe, expect, it } from 'vitest';
import {
  applyChaseBeanRelief,
  applyChaseHit,
  chaseProximity,
  createChaseState,
  isCaught,
  manScaleFromDanger,
  manVisibleFromDanger,
  manXFromDanger,
  manZFromDanger,
  tickChase,
} from './chaseLogic';
import {
  CHASE_BEAN_RELIEF,
  CHASE_HIT_DANGER,
  CHASE_MAN_SCALE_FAR,
  CHASE_MAN_SCALE_NEAR,
  CHASE_MAN_SHOW_PROX,
  CHASE_MAN_X_BIAS,
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

describe('man pose — never covers the cup during play', () => {
  it('keeps Z between camera and cup, with play clearance from cup', () => {
    expect(manZFromDanger(0)).toBeCloseTo(CHASE_MAN_Z_FAR, 5);
    expect(manZFromDanger(CHASE_MAX)).toBeCloseTo(CHASE_MAN_Z_NEAR, 5);
    expect(CHASE_MAN_Z_FAR).toBeLessThan(4.0);
    expect(CHASE_MAN_Z_NEAR).toBeGreaterThan(1.4); // clear of cup at z≈0
    expect(CHASE_MAN_Z_NEAR).toBeLessThan(CHASE_MAN_Z_FAR);
  });

  it('always offsets X to the right of the cup in play mode', () => {
    const far = manXFromDanger(0, 0);
    const hot = manXFromDanger(CHASE_MAX, 0);
    expect(far).toBeGreaterThanOrEqual(0.75);
    expect(hot).toBeGreaterThanOrEqual(0.75);
    expect(far).toBeCloseTo(CHASE_MAN_X_BIAS, 5);
    // Cup at lane 0: man never at same x
    expect(Math.abs(hot - 0)).toBeGreaterThan(0.7);
  });

  it('scales modestly in play; catch can grow larger', () => {
    expect(manScaleFromDanger(0)).toBeCloseTo(CHASE_MAN_SCALE_FAR, 5);
    expect(manScaleFromDanger(CHASE_MAX)).toBeCloseTo(CHASE_MAN_SCALE_NEAR, 5);
    expect(CHASE_MAN_SCALE_NEAR).toBeLessThan(0.6);
    const catchScale = manScaleFromDanger(CHASE_MAX, CHASE_MAX, 'catch');
    expect(catchScale).toBeGreaterThan(CHASE_MAN_SCALE_NEAR);
  });

  it('hides at low danger, shows when chase is meaningful', () => {
    expect(manVisibleFromDanger(0)).toBe(false);
    expect(manVisibleFromDanger(CHASE_MAX * CHASE_MAN_SHOW_PROX * 0.5)).toBe(
      false,
    );
    expect(manVisibleFromDanger(CHASE_MAX * 0.5)).toBe(true);
    expect(manVisibleFromDanger(0, CHASE_MAX, true)).toBe(true);
  });

  it('proximity is 0..1', () => {
    expect(chaseProximity({ danger: 0, max: 100 })).toBe(0);
    expect(chaseProximity({ danger: 50, max: 100 })).toBeCloseTo(0.5, 5);
    expect(chaseProximity({ danger: 100, max: 100 })).toBe(1);
  });
});
