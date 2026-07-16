/**
 * Pure player motion (CE-local): lane lerp + jump / double-jump physics.
 */
import {
  DOUBLE_JUMP_BOOST_GRAVITY,
  DOUBLE_JUMP_BOOST_SMOOTH,
  DOUBLE_JUMP_IMMEDIATE_FRAC,
  DOUBLE_JUMP_MAX_IMMEDIATE,
  DOUBLE_JUMP_RISE_KEEP,
  DOUBLE_JUMP_VY,
  FALL_GRAVITY_MULT,
  GRAVITY,
  JUMP_VY,
  LANE_SWITCH_MS,
} from '../engine/constants';

export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - x, 3);
}

export function easeOutQuad(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) * (1 - x);
}

/** Smoothstep 0→1 (professional ease, no sharp corners). */
export function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export interface LaneMotion {
  lane: number;
  targetLane: number;
  laneX: number;
  laneFromX: number;
  laneToX: number;
  laneSwitchT: number;
}

export function tickLaneMotion(
  p: LaneMotion,
  dt: number,
  _laneXs?: readonly number[],
): LaneMotion {
  if (p.laneSwitchT >= 1) return { ...p };
  const laneSwitchT = Math.min(1, p.laneSwitchT + (dt * 1000) / LANE_SWITCH_MS);
  const e = easeOutCubic(laneSwitchT);
  const laneX = p.laneFromX + (p.laneToX - p.laneFromX) * e;
  const lane = laneSwitchT >= 1 ? p.targetLane : p.lane;
  return {
    ...p,
    laneSwitchT,
    laneX,
    lane,
    // keep targets
    targetLane: p.targetLane,
    laneFromX: p.laneFromX,
    laneToX: p.laneToX,
  };
}

export interface JumpMotion {
  y: number;
  vy: number;
  onGround: boolean;
  airT: number;
  /** Remaining upward boost to ease in after double jump (0 = none). */
  doubleBoostLeft?: number;
}

export function tickJump(p: JumpMotion, dt: number): JumpMotion {
  let { y, vy, onGround, airT } = p;
  let doubleBoostLeft = p.doubleBoostLeft ?? 0;
  const boosting = doubleBoostLeft > 0 && !onGround;

  // Ease remaining double-jump boost into velocity (silky, not instant).
  // Use a frame-rate-stable exponential toward the remaining pool so the
  // lift never arrives as a single-frame spike.
  if (boosting) {
    const frac = 1 - Math.exp(-DOUBLE_JUMP_BOOST_SMOOTH * dt);
    const apply = Math.min(doubleBoostLeft, doubleBoostLeft * frac + 1e-6);
    vy += apply;
    doubleBoostLeft -= apply;
    if (doubleBoostLeft < 0.015) doubleBoostLeft = 0;
  }

  // Stronger pull while falling → clean landings without a slap.
  // During the double-jump ease-in, lighten gravity so the puff floats up.
  let g = vy < 0 ? GRAVITY * FALL_GRAVITY_MULT : GRAVITY;
  if (boosting) g *= DOUBLE_JUMP_BOOST_GRAVITY;
  vy -= g * dt;
  y += vy * dt;
  if (y <= 0) {
    y = 0;
    vy = 0;
    onGround = true;
    airT = 0;
    doubleBoostLeft = 0;
  } else {
    onGround = false;
    airT += dt;
  }
  return { y, vy, onGround, airT, doubleBoostLeft };
}

export interface JumpImpulseResult {
  /** Immediate velocity after the jump (blended, not hard-reset). */
  vy: number;
  onGround: false;
  jumpsLeft: number;
  /** True when this was the extra air jump */
  isDouble: boolean;
  /**
   * Extra upward impulse to ease in over the next frames (double jump only).
   * Ground jumps set this to 0.
   */
  doubleBoostLeft: number;
}

/**
 * Plan a smooth double-jump velocity change.
 * Almost all of the lift is deferred into `boostLeft` and eased over the next
 * frames — the press only applies a tiny, hard-capped kick so reverse-from-fall
 * never feels sharp.
 *
 * Net upward energy still targets DOUBLE_JUMP_VY so peak height stays fair.
 */
export function planDoubleJump(currentVy: number): {
  immediateVy: number;
  boostLeft: number;
} {
  if (currentVy >= DOUBLE_JUMP_VY) {
    // Already rising hard — keep most of the excess, no extra boost needed
    return {
      immediateVy:
        DOUBLE_JUMP_VY + (currentVy - DOUBLE_JUMP_VY) * DOUBLE_JUMP_RISE_KEEP,
      boostLeft: 0,
    };
  }

  // Soft-cancel a slice of downward speed on press (capped — rest eases in)
  let base = currentVy;
  if (currentVy < 0) {
    const cancelNow = Math.min(-currentVy, DOUBLE_JUMP_MAX_IMMEDIATE);
    base = currentVy + cancelNow;
  }

  const target = DOUBLE_JUMP_VY;
  const gap = target - base;
  // Tiny upward kick on top of the soft cancel
  const kick = Math.min(
    DOUBLE_JUMP_MAX_IMMEDIATE * 0.55,
    Math.max(0.12, gap * DOUBLE_JUMP_IMMEDIATE_FRAC),
  );
  const immediateVy = base + kick;
  // Remaining energy (including unfinished fall cancel) eases in over frames
  const boostLeft = Math.max(0, target - immediateVy);
  return { immediateVy, boostLeft };
}

/** @deprecated use planDoubleJump — kept for tests that check net upward intent */
export function blendDoubleJumpVy(currentVy: number): number {
  const { immediateVy, boostLeft } = planDoubleJump(currentVy);
  return immediateVy + boostLeft;
}

/**
 * Apply ground or double jump from remaining jump budget.
 * jumpsLeft is expected 1..MAX while airborne allowance remains.
 * currentVy is used only for double-jump blending (smooth feel).
 */
export function applyJumpImpulse(
  jumpsLeft: number,
  onGround: boolean,
  currentVy = 0,
): JumpImpulseResult | null {
  if (jumpsLeft <= 0) return null;
  if (onGround) {
    // First jump from ground — full instant impulse (crisp takeoff is correct here)
    return {
      vy: JUMP_VY,
      onGround: false,
      jumpsLeft: Math.max(0, jumpsLeft - 1),
      isDouble: false,
      doubleBoostLeft: 0,
    };
  }
  // Air / double jump — plan a smooth boost (no hard velocity reset)
  const plan = planDoubleJump(currentVy);
  return {
    vy: plan.immediateVy,
    onGround: false,
    jumpsLeft: Math.max(0, jumpsLeft - 1),
    isDouble: true,
    doubleBoostLeft: plan.boostLeft,
  };
}

/** Run-cycle phase advance from speed. */
export function tickRunAnim(runAnim: number, dt: number, speed: number): number {
  return runAnim + dt * Math.max(8, speed / 0.3);
}

/** Bank angle while switching lanes (radians around Z). */
export function laneBank(
  laneSwitchT: number,
  laneFromX: number,
  laneToX: number,
): number {
  if (laneSwitchT >= 1) return 0;
  const peak = Math.sin(laneSwitchT * Math.PI);
  return (laneToX - laneFromX) * 0.5 * peak;
}

/**
 * Smooth ease-in-out for the double-jump flip (no sharp corners).
 * Slightly stronger ease than plain smoothstep so the spin accelerates
 * then settles cleanly upright.
 */
export function easeInOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * Forward tilt for cup (radians around X).
 * Normal air: soft lean. Double jump: one smooth full front-flip
 * (reactT 1 → 0 over DOUBLE_JUMP_REACT_SEC).
 */
export function cupTiltX(
  onGround: boolean,
  airT: number,
  doubleJumpReactT = 0,
): number {
  if (onGround) return -0.1;
  // Soft air lean that settles (not a continuous spin)
  const airLean = -0.14 - Math.min(0.14, airT * 0.22);

  if (doubleJumpReactT <= 0) return airLean;

  // One full front flip: progress 0 at kick → 1 when react ends
  const progress = 1 - Math.min(1, Math.max(0, doubleJumpReactT));
  const flip = -Math.PI * 2 * easeInOutCubic(progress);
  // Blend air lean in only near the start/end so the mid-spin is clean
  const leanMix = 1 - Math.sin(progress * Math.PI);
  return flip + airLean * leanMix * 0.35;
}

/**
 * Non-uniform scale for a soft double-jump squash/stretch (sx, sy, sz).
 * Mild stretch through the flip peak — pro platformer feel.
 * reactT goes 1 → 0 over DOUBLE_JUMP_REACT_SEC.
 */
export function doubleJumpScale(reactT: number): {
  x: number;
  y: number;
  z: number;
} {
  if (reactT <= 0) return { x: 1, y: 1, z: 1 };
  const progress = 1 - Math.min(1, reactT);
  // Peak stretch mid-flip, settle upright
  const wave = Math.sin(progress * Math.PI);
  const x = 1 + 0.06 * wave;
  const y = 1 - 0.05 * wave;
  return { x, y, z: x };
}
