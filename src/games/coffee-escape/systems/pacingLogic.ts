/**
 * Pure pacing helpers (CE-local): speed ramp, score, boost meter.
 * No DOM / Three — unit tested so balance changes stay safe.
 */
import {
  BASE_SPEED,
  MAX_SPEED,
  SCORE_PER_SECOND,
  SPEED_GRACE_SECONDS,
  SPEED_RAMP,
} from '../engine/constants';

/** World scroll speed at a given run time (seconds). */
export function speedAtTime(worldTime: number): number {
  const rampStart = Math.max(0, worldTime - SPEED_GRACE_SECONDS);
  return Math.min(MAX_SPEED, BASE_SPEED + rampStart * SPEED_RAMP);
}

/** Time-based score (beans add separately in runtime). */
export function scoreFromTime(worldTime: number): number {
  return Math.floor(worldTime * SCORE_PER_SECOND);
}

export interface BoostTickInput {
  active: boolean;
  timer: number;
  meter: number;
  max: number;
  cost: number;
  duration: number;
  /** Fill rate: full meter in this many seconds while inactive */
  fillSeconds?: number;
}

export interface BoostTickResult {
  active: boolean;
  timer: number;
  meter: number;
  justEnded: boolean;
}

/**
 * Advance boost meter by dt.
 * Active: timer counts down; meter stays at least at cost until end, then 0.
 * Inactive: meter fills toward max.
 */
export function tickBoost(state: BoostTickInput, dt: number): BoostTickResult {
  const fillSeconds = state.fillSeconds ?? 7;
  let { active, timer, meter } = state;
  let justEnded = false;

  if (active) {
    timer -= dt;
    if (timer <= 0) {
      active = false;
      timer = 0;
      meter = 0;
      justEnded = true;
    } else if (meter < state.cost) {
      meter = state.cost;
    }
  } else {
    meter = Math.min(state.max, meter + dt * (100 / fillSeconds));
  }

  return { active, timer, meter, justEnded };
}

/** Start a boost if allowed; returns new boost fields or null if denied. */
export function startBoost(state: {
  active: boolean;
  meter: number;
  cost: number;
  duration: number;
}): { active: true; timer: number } | null {
  if (state.active) return null;
  if (state.meter < state.cost) return null;
  return { active: true, timer: state.duration };
}

/** Seconds until next timed bean spawn. */
export function nextBeanDelay(
  min: number,
  max: number,
  random: () => number = Math.random,
): number {
  return min + random() * (max - min);
}
