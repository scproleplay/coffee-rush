import { describe, expect, it } from 'vitest';
import {
  applyJumpImpulse,
  cupTiltX,
  easeOutCubic,
  laneBank,
  tickJump,
  tickLaneMotion,
  tickRunAnim,
} from './playerMotion';
import { JUMP_VY, LANE_X } from '../engine/constants';

describe('easeOutCubic', () => {
  it('maps 0..1', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe('tickLaneMotion', () => {
  it('interpolates toward target and finishes', () => {
    let p: {
      lane: number;
      targetLane: number;
      laneX: number;
      laneFromX: number;
      laneToX: number;
      laneSwitchT: number;
    } = {
      lane: 1,
      targetLane: 2,
      laneX: LANE_X[1],
      laneFromX: LANE_X[1],
      laneToX: LANE_X[2],
      laneSwitchT: 0,
    };
    p = tickLaneMotion(p, 0.05, LANE_X);
    expect(p.laneSwitchT).toBeGreaterThan(0);
    expect(p.laneX).not.toBe(LANE_X[1]);

    // long enough to finish
    p = tickLaneMotion({ ...p, laneSwitchT: 0.99 }, 0.1, LANE_X);
    expect(p.laneSwitchT).toBe(1);
    expect(p.lane).toBe(2);
  });
});

describe('tickJump', () => {
  it('lands on ground and clears velocity', () => {
    tickJump({ y: 0.1, vy: -5, onGround: false, airT: 0.2 }, 0.05);
    const landed = tickJump({ y: 0.01, vy: -10, onGround: false, airT: 0.5 }, 0.05);
    expect(landed.y).toBe(0);
    expect(landed.vy).toBe(0);
    expect(landed.onGround).toBe(true);
    expect(landed.airT).toBe(0);
  });

  it('leaves ground when rising', () => {
    const r = tickJump({ y: 0, vy: JUMP_VY, onGround: true, airT: 0 }, 0.05);
    expect(r.y).toBeGreaterThan(0);
    expect(r.onGround).toBe(false);
  });
});

describe('applyJumpImpulse', () => {
  it('only on ground', () => {
    expect(applyJumpImpulse(true)).toEqual({ vy: JUMP_VY, onGround: false });
    expect(applyJumpImpulse(false)).toBeNull();
  });
});

describe('tickRunAnim', () => {
  it('advances with speed', () => {
    const a = tickRunAnim(0, 1, 12);
    const b = tickRunAnim(0, 1, 36);
    expect(b).toBeGreaterThan(a);
  });
});

describe('visual helpers', () => {
  it('laneBank peaks mid-switch', () => {
    expect(laneBank(1, 0, 1.6)).toBe(0);
    expect(laneBank(0.5, 0, 1.6)).not.toBe(0);
  });

  it('cupTiltX flips in air', () => {
    expect(cupTiltX(true, 0)).toBeCloseTo(-0.1, 5);
    expect(cupTiltX(false, 0.7)).toBeGreaterThan(5);
  });
});
