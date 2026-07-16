/**
 * Pure tired-man chase meter (CE-local).
 * No AI pathing — danger rises on hits, falls on caffeine/boost.
 */
import {
  CHASE_BEAN_RELIEF,
  CHASE_BOOST_DRAIN_PER_SEC,
  CHASE_HIT_DANGER,
  CHASE_HIT_IFRAME_SEC,
  CHASE_MAN_SCALE_CATCH,
  CHASE_MAN_SCALE_FAR,
  CHASE_MAN_SCALE_NEAR,
  CHASE_MAN_SHOW_PROX,
  CHASE_MAN_X_BIAS,
  CHASE_MAN_Y,
  CHASE_MAN_Z_CATCH,
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

/** Meter story labels for HUD (no 3D man required). */
export type ChaseTier = 'safe' | 'coming' | 'close' | 'caught';

export function chaseTierFromProximity(prox: number): ChaseTier {
  if (prox >= 1 - 1e-6) return 'caught';
  if (prox >= 0.7) return 'close';
  if (prox >= 0.35) return 'coming';
  return 'safe';
}

export function chaseTierLabel(tier: ChaseTier): string {
  switch (tier) {
    case 'safe':
      return 'SAFE';
    case 'coming':
      return "HE'S COMING";
    case 'close':
      return "HE'S CLOSE";
    case 'caught':
      return 'CAUGHT!';
  }
}

export type ManPoseMode = 'play' | 'catch';

/** Map danger → man world Z. Play keeps clearance from the cup; catch closes in. */
export function manZFromDanger(
  danger: number,
  max = CHASE_MAX,
  mode: ManPoseMode = 'play',
): number {
  const t = max <= 0 ? 0 : clampDanger(danger, max) / max;
  if (mode === 'catch') {
    return CHASE_MAN_Z_NEAR + (CHASE_MAN_Z_CATCH - CHASE_MAN_Z_NEAR) * t;
  }
  return CHASE_MAN_Z_FAR + (CHASE_MAN_Z_NEAR - CHASE_MAN_Z_FAR) * t;
}

/**
 * Always offset to the RIGHT of the cup so the player silhouette stays free.
 * Bias shrinks a little when hot, but never enough to center on the cup.
 */
export function manXFromDanger(
  danger: number,
  playerLaneX: number,
  max = CHASE_MAX,
  mode: ManPoseMode = 'play',
): number {
  const t = max <= 0 ? 0 : clampDanger(danger, max) / max;
  if (mode === 'catch') {
    // Slide toward the cup for the catch beat
    return playerLaneX + CHASE_MAN_X_BIAS * (1 - t * 0.85);
  }
  // Keep a solid offset during play (min ~0.75 so cup is never covered)
  const bias = CHASE_MAN_X_BIAS * (1 - t * 0.28);
  return playerLaneX + Math.max(0.75, bias);
}

/** Scale: tiny when far, modest when hot; catch can grow larger. */
export function manScaleFromDanger(
  danger: number,
  max = CHASE_MAX,
  mode: ManPoseMode = 'play',
): number {
  const t = max <= 0 ? 0 : clampDanger(danger, max) / max;
  const eased = t * t * (3 - 2 * t);
  if (mode === 'catch') {
    return (
      CHASE_MAN_SCALE_NEAR +
      (CHASE_MAN_SCALE_CATCH - CHASE_MAN_SCALE_NEAR) * eased
    );
  }
  return (
    CHASE_MAN_SCALE_FAR + (CHASE_MAN_SCALE_NEAR - CHASE_MAN_SCALE_FAR) * eased
  );
}

/** Y sink — slightly lower in the frame so he reads under/behind the cup. */
export function manYFromDanger(
  danger: number,
  max = CHASE_MAX,
  bob = 0,
): number {
  const t = max <= 0 ? 0 : clampDanger(danger, max) / max;
  // Sink a bit more when far (smaller presence); less when close
  return CHASE_MAN_Y - 0.08 * (1 - t) + bob;
}

/** Hide when chase is quiet — meter alone carries early pressure. */
export function manVisibleFromDanger(
  danger: number,
  max = CHASE_MAX,
  forceShow = false,
): boolean {
  if (forceShow) return true;
  return chaseProximity({ danger, max }) >= CHASE_MAN_SHOW_PROX;
}
