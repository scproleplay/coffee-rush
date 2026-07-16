import { describe, expect, it } from 'vitest';
import {
  applyChaseBeanRelief,
  applyChaseHit,
  chaseProximity,
  chaseTierFromProximity,
  chaseTierLabel,
  createChaseState,
  isCaught,
  tickChase,
} from './chaseLogic';
import { CHASE_BEAN_RELIEF, CHASE_HIT_DANGER, CHASE_MAX } from '../engine/constants';

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

describe('chase tiers (meter story)', () => {
  it('maps proximity to Safe / Coming / Close / Caught', () => {
    expect(chaseTierFromProximity(0)).toBe('safe');
    expect(chaseTierFromProximity(0.2)).toBe('safe');
    expect(chaseTierFromProximity(0.35)).toBe('coming');
    expect(chaseTierFromProximity(0.5)).toBe('coming');
    expect(chaseTierFromProximity(0.7)).toBe('close');
    expect(chaseTierFromProximity(0.95)).toBe('close');
    expect(chaseTierFromProximity(1)).toBe('caught');
  });

  it('labels match the chase story', () => {
    expect(chaseTierLabel('safe')).toBe('SAFE');
    expect(chaseTierLabel('coming')).toMatch(/COMING/i);
    expect(chaseTierLabel('close')).toMatch(/CLOSE/i);
    expect(chaseTierLabel('caught')).toMatch(/CAUGHT/i);
  });

  it('proximity is 0..1', () => {
    expect(chaseProximity({ danger: 0, max: 100 })).toBe(0);
    expect(chaseProximity({ danger: 50, max: 100 })).toBeCloseTo(0.5, 5);
    expect(chaseProximity({ danger: 100, max: 100 })).toBe(1);
  });
});
