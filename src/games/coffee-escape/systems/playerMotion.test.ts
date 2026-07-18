import { describe, expect, it } from 'vitest';
import {
  applyJumpImpulse,
  blendDoubleJumpVy,
  cupTiltX,
  doubleJumpScale,
  easeOutCubic,
  laneBank,
  planDoubleJump,
  tickJump,
  tickLaneMotion,
  tickRunAnim,
} from './playerMotion';
import { DOUBLE_JUMP_VY, JUMP_VY, LANE_X } from '../engine/constants';

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

    p = tickLaneMotion({ ...p, laneSwitchT: 0.99 }, 0.1, LANE_X);
    expect(p.laneSwitchT).toBe(1);
    expect(p.lane).toBe(2);
  });

  it('side lanes are clearly separated from center', () => {
    expect(LANE_X[2]! - LANE_X[1]!).toBeGreaterThanOrEqual(2.0);
    expect(LANE_X[1]! - LANE_X[0]!).toBeGreaterThanOrEqual(2.0);
  });
});

describe('tickJump', () => {
  it('lands on ground and clears velocity', () => {
    const landed = tickJump({ y: 0.01, vy: -10, onGround: false, airT: 0.5 }, 0.05);
    expect(landed.y).toBe(0);
    expect(landed.vy).toBe(0);
    expect(landed.onGround).toBe(true);
    expect(landed.airT).toBe(0);
    expect(landed.doubleBoostLeft).toBe(0);
  });

  it('leaves ground when rising', () => {
    const r = tickJump({ y: 0, vy: JUMP_VY, onGround: true, airT: 0 }, 0.05);
    expect(r.y).toBeGreaterThan(0);
    expect(r.onGround).toBe(false);
  });

  it('eases double-jump boost in over time (not all at once)', () => {
    const start = tickJump(
      { y: 1, vy: 1, onGround: false, airT: 0.2, doubleBoostLeft: 3 },
      1 / 60,
    );
    expect(start.doubleBoostLeft!).toBeLessThan(3);
    expect(start.doubleBoostLeft!).toBeGreaterThan(0);
    expect(start.vy).toBeGreaterThan(1);
  });
});

describe('applyJumpImpulse', () => {
  it('ground jump spends one charge', () => {
    expect(applyJumpImpulse(2, true)).toEqual({
      vy: JUMP_VY,
      onGround: false,
      jumpsLeft: 1,
      isDouble: false,
      doubleBoostLeft: 0,
    });
  });

  it('air double jump when charges remain', () => {
    const r = applyJumpImpulse(1, false, 0);
    expect(r).not.toBeNull();
    expect(r!.isDouble).toBe(true);
    expect(r!.jumpsLeft).toBe(0);
    expect(r!.vy).toBeGreaterThan(0);
    // Immediate vy is only part of the boost — rest eases in
    expect(r!.vy + r!.doubleBoostLeft).toBeCloseTo(DOUBLE_JUMP_VY, 5);
    expect(r!.doubleBoostLeft).toBeGreaterThan(0);
  });

  it('double jump is not stronger than first jump (steam puff, not rocket)', () => {
    expect(DOUBLE_JUMP_VY).toBeLessThanOrEqual(JUMP_VY);
    expect(DOUBLE_JUMP_VY).toBeLessThan(JUMP_VY * 0.75);
  });

  it('falls faster than it rises for clean landings', () => {
    const rise = tickJump({ y: 1, vy: 2, onGround: false, airT: 0.1 }, 0.05);
    const fall = tickJump({ y: 1, vy: -2, onGround: false, airT: 0.1 }, 0.05);
    expect(Math.abs(fall.vy) - 2).toBeGreaterThan(2 - rise.vy);
  });

  it('denies when no jumps left', () => {
    expect(applyJumpImpulse(0, false)).toBeNull();
    expect(applyJumpImpulse(0, true)).toBeNull();
  });
});

describe('planDoubleJump / blendDoubleJumpVy', () => {
  it('does not yank downward when already rising faster than double boost', () => {
    const rising = JUMP_VY * 0.7;
    const plan = planDoubleJump(rising);
    expect(plan.immediateVy).toBeGreaterThanOrEqual(DOUBLE_JUMP_VY);
    expect(plan.boostLeft).toBe(0);
  });

  it('splits apex boost into tiny immediate + large eased remainder', () => {
    const plan = planDoubleJump(0.5);
    expect(plan.immediateVy).toBeGreaterThan(0.5);
    expect(plan.immediateVy).toBeLessThan(DOUBLE_JUMP_VY);
    // Most of the lift is deferred (silky puff, not a slap)
    expect(plan.boostLeft).toBeGreaterThan(plan.immediateVy - 0.5);
    expect(plan.immediateVy + plan.boostLeft).toBeCloseTo(DOUBLE_JUMP_VY, 5);
  });

  it('caps on-press kick when reversing a fall (no whip)', () => {
    const plan = planDoubleJump(-4);
    // Immediate step is only a soft soft-cancel + small kick — rest eases in
    expect(plan.immediateVy - -4).toBeLessThanOrEqual(DOUBLE_JUMP_VY);
    expect(plan.immediateVy).toBeLessThan(DOUBLE_JUMP_VY * 0.55);
    expect(plan.boostLeft).toBeGreaterThan(0);
    // Net upward energy still reaches the double-jump target
    expect(plan.immediateVy + plan.boostLeft).toBeCloseTo(DOUBLE_JUMP_VY, 5);
    expect(blendDoubleJumpVy(-4)).toBeCloseTo(DOUBLE_JUMP_VY, 5);
  });

  it('eases fall reverse over multiple frames instead of one snap', () => {
    const fallVy = -2;
    const plan = planDoubleJump(fallVy);
    // On-press frame is only a soft nudge — no instant reverse to full boost
    expect(plan.immediateVy).toBeLessThan(DOUBLE_JUMP_VY * 0.55);
    expect(plan.immediateVy - fallVy).toBeLessThan(2.2);
    expect(plan.boostLeft).toBeGreaterThan(0);

    let motion = {
      y: 1.0,
      vy: plan.immediateVy,
      onGround: false as boolean,
      airT: 0.2,
      doubleBoostLeft: plan.boostLeft,
    };
    const samples: number[] = [motion.vy];
    for (let i = 0; i < 20; i++) {
      motion = { ...motion, ...tickJump(motion, 1 / 60) };
      samples.push(motion.vy);
    }
    // No giant single-frame leap toward full boost
    const step0 = samples[1]! - samples[0]!;
    expect(Math.abs(step0)).toBeLessThan(DOUBLE_JUMP_VY);
    // Boost is consumed over time and velocity improves from the press
    expect(motion.doubleBoostLeft ?? 0).toBeLessThan(plan.boostLeft);
    expect(Math.max(...samples)).toBeGreaterThan(plan.immediateVy);
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

  it('cupTiltX is gentle in air when not flipping', () => {
    expect(cupTiltX(true, 0)).toBeCloseTo(-0.1, 5);
    // Long air time without double-jump react stays a lean
    expect(Math.abs(cupTiltX(false, 0.7, 0))).toBeLessThan(1.2);
  });

  it('cupTiltX does one smooth full front-flip during double-jump react', () => {
    const start = cupTiltX(false, 0.2, 1); // kick frame
    const mid = cupTiltX(false, 0.2, 0.5); // mid flip
    const end = cupTiltX(false, 0.2, 0); // settled
    // Progresses forward (negative X = front flip)
    expect(mid).toBeLessThan(start);
    expect(mid).toBeLessThan(-Math.PI * 0.6);
    // Lands near upright lean (not stuck mid-spin)
    expect(Math.abs(end)).toBeLessThan(0.6);
    // Full rotation span ~ one turn
    expect(Math.abs(mid - start)).toBeGreaterThan(Math.PI * 0.5);
  });

  it('doubleJumpScale returns identity when idle and mild mid-flip', () => {
    expect(doubleJumpScale(0)).toEqual({ x: 1, y: 1, z: 1 });
    const s = doubleJumpScale(0.5);
    expect(Math.abs(s.x - 1)).toBeLessThan(0.12);
    expect(Math.abs(s.y - 1)).toBeLessThan(0.12);
  });
});
