/**
 * Pure spawn helpers for Coffee Escape (CE-local).
 * No Three.js, no DOM — easy to unit test without breaking other games.
 */
import {
  OBSTACLE_KINDS,
  type ObstacleKind,
  isObstacleKind,
} from '../entities/obstacleKinds';
import {
  OBSTACLE_START_Z,
  PAIR_SPAWN_BASE,
  PAIR_SPAWN_RAMP,
  SPAWN_INTERVAL_MIN,
  SPAWN_INTERVAL_START,
  SPAWN_JITTER,
  SPAWN_RAMP_SECONDS,
} from '../engine/constants';

export type RandomFn = () => number;

export function isKindAvailable(kind: ObstacleKind, worldTime: number): boolean {
  const meta = OBSTACLE_KINDS[kind];
  if (meta.jumpHeight > 0.7 && worldTime < 12) return false;
  return true;
}

const BASE_WEIGHT: Record<ObstacleKind, number> = {
  spill: 4,
  cable: 3,
  mug: 3,
  chair: 5,
  box: 3,
  plant: 2,
  printer: 3,
  watercooler: 2,
  filingcabinet: 2,
  desk: 2,
  worker: 2,
};

const HARD_BOOST: Partial<Record<ObstacleKind, number>> = {
  watercooler: 1.5,
  filingcabinet: 1.5,
  printer: 0.8,
  desk: 1.0,
  worker: 1.0,
};

/** Weighted pick of obstacle kind. Inject random for tests. */
export function pickKind(worldTime: number, random: RandomFn = Math.random): ObstacleKind {
  const available = (Object.keys(OBSTACLE_KINDS) as ObstacleKind[]).filter((k) =>
    isKindAvailable(k, worldTime),
  );
  if (available.length === 0) return 'chair';

  const rampT = Math.min(1, worldTime / 40);
  const weights: Partial<Record<ObstacleKind, number>> = {};
  for (const k of available) {
    let w = BASE_WEIGHT[k] || 2;
    if (HARD_BOOST[k]) w += (HARD_BOOST[k] as number) * rampT;
    if (OBSTACLE_KINDS[k].wide && worldTime < 15) w = 0;
    weights[k] = w;
  }

  let total = 0;
  for (const k of available) total += weights[k] || 0;
  if (total <= 0) return 'chair';

  let r = random() * total;
  for (const k of available) {
    const w = weights[k] || 0;
    if (r < w) return k;
    r -= w;
  }
  return 'chair';
}

/** Chance of a two-lane pair spawn (capped). */
export function pairSpawnChance(worldTime: number): number {
  return Math.min(0.45, PAIR_SPAWN_BASE + worldTime * PAIR_SPAWN_RAMP);
}

export function shouldSpawnPair(
  worldTime: number,
  random: RandomFn = Math.random,
): boolean {
  if (worldTime <= 6) return false;
  return random() < pairSpawnChance(worldTime);
}

/**
 * Next single-spawn lane. Avoids last lane when known so player always
 * has a switch option between consecutive singles.
 */
export function pickLane(lastObLane: number, random: RandomFn = Math.random): number {
  let avoid = -1;
  if (lastObLane >= 0) avoid = lastObLane;
  const choices = [0, 1, 2].filter((l) => l !== avoid);
  return choices[Math.floor(random() * choices.length)]!;
}

/** Z for a new obstacle far enough for reaction time at current speed. */
export function pickZ(
  lastObZ: number,
  speed: number,
  random: RandomFn = Math.random,
): number {
  if (lastObZ <= -900) {
    return OBSTACLE_START_Z - random() * 4;
  }
  const minGap = Math.max(6, speed * 0.4);
  return lastObZ - minGap - random() * 2.5;
}

/** Seconds until next spawn after one fires. */
export function nextSpawnDelay(
  worldTime: number,
  random: RandomFn = Math.random,
): number {
  const rampT = Math.min(1, worldTime / SPAWN_RAMP_SECONDS);
  const baseInterval =
    SPAWN_INTERVAL_START + (SPAWN_INTERVAL_MIN - SPAWN_INTERVAL_START) * rampT;
  return baseInterval * (1 - SPAWN_JITTER + random() * SPAWN_JITTER * 2);
}

/** Safe lanes for a pair (two lanes get obstacles; one is open). */
export function pairLanes(safeLane: number): [number, number] {
  const lanes = [0, 1, 2].filter((l) => l !== safeLane) as number[];
  return [lanes[0]!, lanes[1]!];
}

export function assertObstacleKind(kind: string): ObstacleKind {
  if (!isObstacleKind(kind)) throw new Error(`Unknown obstacle kind: ${kind}`);
  return kind;
}
