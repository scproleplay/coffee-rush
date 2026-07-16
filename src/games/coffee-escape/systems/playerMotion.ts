/**
 * Pure player motion (CE-local): lane lerp + jump / double-jump physics.
 */
import {
  DOUBLE_JUMP_FALL_SOFT,
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
}

export function tickJump(p: JumpMotion, dt: number): JumpMotion {
  let { y, vy, onGround, airT } = p;
  // Stronger pull while falling → less floaty, snappier landings
  const g = vy < 0 ? GRAVITY * FALL_GRAVITY_MULT : GRAVITY;
  vy -= g * dt;
  y += vy * dt;
  if (y <= 0) {
    y = 0;
    vy = 0;
    onGround = true;
    airT = 0;
  } else {
    onGround = false;
    airT += dt;
  }
  return { y, vy, onGround, airT };
}

export interface JumpImpulseResult {
  vy: number;
  onGround: false;
  jumpsLeft: number;
  /** True when this was the extra air jump */
  isDouble: boolean;
}

/**
 * Blend double-jump velocity instead of hard-resetting.
 * - Rising faster than DOUBLE_JUMP_VY: keep a little of the excess (no yank down)
 * - Rising slower / peaking: lift to DOUBLE_JUMP_VY
 * - Falling: soft cancel of downward speed + DOUBLE_JUMP_VY (smooth steam kick)
 *
 * Peak height stays near the previous hard-reset design.
 */
export function blendDoubleJumpVy(currentVy: number): number {
  if (currentVy >= DOUBLE_JUMP_VY) {
    return DOUBLE_JUMP_VY + (currentVy - DOUBLE_JUMP_VY) * DOUBLE_JUMP_RISE_KEEP;
  }
  if (currentVy >= 0) {
    return DOUBLE_JUMP_VY;
  }
  // Falling: cancel most of the drop without a harsh reverse snap
  return DOUBLE_JUMP_VY + currentVy * DOUBLE_JUMP_FALL_SOFT;
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
    // First jump from ground — spend one, leave one for double
    return {
      vy: JUMP_VY,
      onGround: false,
      jumpsLeft: Math.max(0, jumpsLeft - 1),
      isDouble: false,
    };
  }
  // Air / double jump — steam puff with velocity blend (not a hard reset)
  return {
    vy: blendDoubleJumpVy(currentVy),
    onGround: false,
    jumpsLeft: Math.max(0, jumpsLeft - 1),
    isDouble: true,
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
 * Forward tilt / flip for cup (radians around X).
 * Double-jump reactT softens the spin so the second kick feels snappy, not snapped.
 */
export function cupTiltX(
  onGround: boolean,
  airT: number,
  doubleJumpReactT = 0,
): number {
  const runTilt = onGround ? 0.1 : 0;
  let tiltX = -runTilt;
  if (!onGround) {
    // Slightly slower spin so air reads cleaner
    tiltX += airT * ((2 * Math.PI) / 0.82);
    // Quick forward kick on double jump, eases out
    if (doubleJumpReactT > 0) {
      const k = easeOutQuad(Math.min(1, doubleJumpReactT));
      tiltX += -0.55 * k;
    }
  }
  return tiltX;
}

/**
 * Uniform scale for double-jump squash/stretch (1 = normal).
 * reactT goes 1 → 0 over DOUBLE_JUMP_REACT_SEC.
 */
export function doubleJumpScale(reactT: number): number {
  if (reactT <= 0) return 1;
  const k = easeOutQuad(Math.min(1, reactT));
  // Brief squash then stretch back — steam kick silhouette
  return 1 - 0.12 * k + 0.06 * Math.sin(k * Math.PI);
}
