/**
 * Pure player motion (CE-local): lane lerp + jump / double-jump physics.
 */
import {
  DOUBLE_JUMP_VY,
  GRAVITY,
  JUMP_VY,
  LANE_SWITCH_MS,
} from '../engine/constants';

export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - x, 3);
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
  vy -= GRAVITY * dt;
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
 * Apply ground or double jump from remaining jump budget.
 * jumpsLeft is expected 1..MAX while airborne allowance remains.
 */
export function applyJumpImpulse(
  jumpsLeft: number,
  onGround: boolean,
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
  // Air / double jump
  return {
    vy: DOUBLE_JUMP_VY,
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

/** Forward tilt / flip for cup (radians around X). */
export function cupTiltX(onGround: boolean, airT: number): number {
  const runTilt = onGround ? 0.1 : 0;
  let tiltX = -runTilt;
  if (!onGround) {
    tiltX += airT * ((2 * Math.PI) / 0.7);
  }
  return tiltX;
}
