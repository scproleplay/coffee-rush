/**
 * Pure tired-man chase meter (CE-local).
 * No AI pathing — danger rises on hits, falls on caffeine/boost.
 */
import {
  CHASE_BEAN_RELIEF,
  CHASE_BOOST_DRAIN_PER_SEC,
  CHASE_HIT_DANGER,
  CHASE_HIT_IFRAME_SEC,
  CHASE_MAN_X,
  CHASE_MAN_Z_FAR,
  CHASE_MAN_Z_NEAR,
  CHASE_MAX,
  CHASE_PASSIVE_PER_SEC,
} from '../engine/constants';

export interface ChaseState {
  /** 0..max — how close the man is to catching the cup. */
  danger: number;
  max: number;
  /** Remaining invulnerability after a hit (seconds). */
  hitIFrame: number;
}

export function createChaseState(): ChaseState {
  return {
    danger: 0,
    max: CHASE_MAX,
    hitIFrame: 0,
  };
}

export function clampDanger(danger: number, max = CHASE_MAX): number {
  return Math.max(0, Math.min(max, danger));
}

/** Apply an obstacle hit. Returns null if still in i-frames. */
export function applyChaseHit(
  chase: ChaseState,
  amount = CHASE_HIT_DANGER,
): ChaseState | null {
  if (chase.hitIFrame > 0) return null;
  return {
    ...chase,
    danger: clampDanger(chase.danger + amount, chase.max),
    hitIFrame: CHASE_HIT_IFRAME_SEC,
  };
}

export function applyChaseBeanRelief(
  chase: ChaseState,
  amount = CHASE_BEAN_RELIEF,
): ChaseState {
  return {
    ...chase,
    danger: clampDanger(chase.danger - amount, chase.max),
  };
}

/**
 * Per-frame chase tick: passive creep, boost drain, i-frame countdown.
 * Does not apply hits/beans (those are event-driven).
 */
export function tickChase(
  chase: ChaseState,
  dt: number,
  opts: { boostActive: boolean },
): ChaseState {
  let { danger, hitIFrame } = chase;
  const max = chase.max;

  if (hitIFrame > 0) {
    hitIFrame = Math.max(0, hitIFrame - dt);
  }

  if (opts.boostActive) {
    danger -= CHASE_BOOST_DRAIN_PER_SEC * dt;
  } else {
    danger += CHASE_PASSIVE_PER_SEC * dt;
  }

  return {
    danger: clampDanger(danger, max),
    max,
    hitIFrame,
  };
}

export function isCaught(chase: Pick<ChaseState, 'danger' | 'max'>): boolean {
  return chase.danger >= chase.max - 1e-6;
}

/** 0 = safe/far, 1 = about to be caught. */
export function chaseProximity(chase: Pick<ChaseState, 'danger' | 'max'>): number {
  if (chase.max <= 0) return 0;
  return Math.max(0, Math.min(1, chase.danger / chase.max));
}

/** Map danger → man world Z (higher Z = farther from cup / closer to camera, clamped). */
export function manZFromDanger(danger: number, max = CHASE_MAX): number {
  const t = max <= 0 ? 0 : clampDanger(danger, max) / max;
  return CHASE_MAN_Z_FAR + (CHASE_MAN_Z_NEAR - CHASE_MAN_Z_FAR) * t;
}

/** Slight horizontal ease toward cup as danger rises — stays on the right side. */
export function manXFromDanger(danger: number, max = CHASE_MAX): number {
  const t = max <= 0 ? 0 : clampDanger(danger, max) / max;
  // Home on right; ease a little toward center when close, but never past mid-right
  return CHASE_MAN_X - t * 0.35;
}
