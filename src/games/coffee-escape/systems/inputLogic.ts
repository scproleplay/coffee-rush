/**
 * Pure input intent helpers for Coffee Escape (CE-local).
 * DOM/event wiring stays in runtime; decisions live here and are unit-tested.
 */

export interface RunFlags {
  running: boolean;
  gameOver: boolean;
}

export interface JumpState extends RunFlags {
  onGround: boolean;
}

export interface BoostStateFlags extends RunFlags {
  boostActive: boolean;
  meter: number;
  cost: number;
}

export type InputAction =
  | { type: 'jump' }
  | { type: 'lane'; delta: -1 | 1 }
  | { type: 'boost' }
  | { type: 'start' }
  | { type: 'restart' }
  | { type: 'none' };

export function canJump(s: JumpState): boolean {
  return s.running && !s.gameOver && s.onGround;
}

export function canChangeLane(s: RunFlags): boolean {
  return s.running && !s.gameOver;
}

export function canBoost(s: BoostStateFlags): boolean {
  return s.running && !s.gameOver && !s.boostActive && s.meter >= s.cost;
}

/** Clamp target lane into 0..2. */
export function clampLane(target: number): number {
  if (target < 0) return 0;
  if (target > 2) return 2;
  return target | 0;
}

export function nextLane(currentTarget: number, delta: -1 | 1): number {
  return clampLane(currentTarget + delta);
}

export interface SwipeThresholds {
  minPx: number;
  maxMs: number;
}

export const DEFAULT_SWIPE: SwipeThresholds = {
  minPx: 24,
  maxMs: 1000,
};

/**
 * Map a completed pointer gesture to an action.
 * Priority: stronger axis wins (vertical jump vs horizontal lane).
 */
export function swipeToAction(
  dx: number,
  dy: number,
  durationMs: number,
  thresholds: SwipeThresholds = DEFAULT_SWIPE,
): InputAction {
  if (durationMs > thresholds.maxMs) return { type: 'none' };
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < thresholds.minPx && ay < thresholds.minPx) return { type: 'none' };

  if (ay >= ax && ay >= thresholds.minPx) {
    // Swipe up = jump (dy negative in screen coords)
    if (dy < 0) return { type: 'jump' };
    return { type: 'none' };
  }
  if (ax >= thresholds.minPx) {
    return { type: 'lane', delta: dx < 0 ? -1 : 1 };
  }
  return { type: 'none' };
}

/** Keyboard code → intent (does not apply state). */
export function keyToAction(code: string, key: string): InputAction {
  if (code === 'Space' || code === 'ArrowUp' || key === ' ') return { type: 'jump' };
  if (code === 'ArrowLeft' || code === 'KeyA') return { type: 'lane', delta: -1 };
  if (code === 'ArrowRight' || code === 'KeyD') return { type: 'lane', delta: 1 };
  if (code === 'ShiftLeft' || code === 'ShiftRight' || key === 'Shift') {
    return { type: 'boost' };
  }
  if (code === 'Enter') {
    // Caller decides start vs restart from UI state
    return { type: 'start' };
  }
  return { type: 'none' };
}
