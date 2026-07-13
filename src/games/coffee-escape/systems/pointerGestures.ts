/**
 * Pure stage gesture resolution (CE-local).
 * DOM/timer wiring stays in inputController; decisions live here + tests.
 */
import { DEFAULT_SWIPE, type SwipeThresholds } from './inputLogic';

export type StageGesture =
  | { type: 'jump' }
  | { type: 'lane'; delta: -1 | 1 }
  | { type: 'none' };

export function tapZoneFromX(
  x: number,
  width: number,
): 'left' | 'center' | 'right' {
  const third = width / 3;
  if (x < third) return 'left';
  if (x > 2 * third) return 'right';
  return 'center';
}

export interface PointerEndInput {
  dx: number;
  dy: number;
  elapsedMs: number;
  didMove: boolean;
  /** clientX relative to canvas left (for tap zones) */
  localX: number;
  canvasWidth: number;
  /** true when 250ms fallback fired (treat as tap) */
  forceTap?: boolean;
  thresholds?: SwipeThresholds;
}

/**
 * Map a completed pointer gesture on the stage to a game action.
 * Mirrors legacy CE behavior: swipe > tap zones.
 */
export function resolveStagePointerEnd(input: PointerEndInput): StageGesture {
  const th = input.thresholds ?? DEFAULT_SWIPE;
  const { dx, dy, elapsedMs, didMove } = input;

  // Swipe: quick drag with enough distance
  if (didMove && elapsedMs < th.maxMs && !input.forceTap) {
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > th.minPx) {
      return { type: 'lane', delta: dx < 0 ? -1 : 1 };
    }
    if (dy < -th.minPx) return { type: 'jump' };
    // swipe down / short noise
    return { type: 'none' };
  }

  // Tap: minimal movement or forced fallback
  if (!didMove || (Math.abs(dx) < 6 && Math.abs(dy) < 6) || input.forceTap) {
    const zone = tapZoneFromX(input.localX, input.canvasWidth);
    if (zone === 'left') return { type: 'lane', delta: -1 };
    if (zone === 'right') return { type: 'lane', delta: 1 };
    return { type: 'jump' };
  }

  return { type: 'none' };
}

/** Dedupe guard for dual click+pointerdown bindings (iOS). */
export function createTapDedupe(windowMs = 500): (fn: () => void) => (e?: Event) => void {
  let last = 0;
  return (fn: () => void) => (e?: Event) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    const now = performance.now();
    if (now - last < windowMs) return;
    last = now;
    fn();
  };
}
