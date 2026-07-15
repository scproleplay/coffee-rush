/**
 * Pure spawn helpers for Coffee Escape (CE-local).
 * Phase 2: house kinds + controlled fair patterns.
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
  SAME_LANE_MIN_GAP,
  SPAWN_INTERVAL_MIN,
  SPAWN_INTERVAL_START,
  SPAWN_JITTER,
  SPAWN_RAMP_SECONDS,
} from '../engine/constants';

export type RandomFn = () => number;

export type SpawnPattern =
  | 'single'
  | 'pair'
  | 'jump_low'
  | 'single_with_bean';

export function isKindAvailable(kind: ObstacleKind, worldTime: number): boolean {
  const meta = OBSTACLE_KINDS[kind];
  // Tall-ish mid furniture later; low hazards always OK
  if (meta.jumpHeight > 0.55 && worldTime < 8) return false;
  if (meta.wide && worldTime < 12) return false;
  return true;
}

const BASE_WEIGHT: Record<ObstacleKind, number> = {
  spill: 4,
  cable: 4,
  rug: 5,
  books: 3,
  toys: 4,
  chair: 6,
  stool: 4,
  pillow: 4,
  box: 4,
  laundry: 3,
  table: 2,
  doorframe: 2,
};

const HARD_BOOST: Partial<Record<ObstacleKind, number>> = {
  laundry: 1.2,
  box: 0.8,
  table: 1.2,
  doorframe: 1.0,
  chair: 0.4,
};

const LOW_JUMP_KINDS: ObstacleKind[] = ['spill', 'cable', 'rug', 'books', 'toys'];

/** Weighted pick of obstacle kind. Inject random for tests. */
export function pickKind(
  worldTime: number,
  random: RandomFn = Math.random,
  opts?: { lowOnly?: boolean; midOnly?: boolean },
): ObstacleKind {
  let available = (Object.keys(OBSTACLE_KINDS) as ObstacleKind[]).filter((k) =>
    isKindAvailable(k, worldTime),
  );
  if (opts?.lowOnly) {
    available = available.filter((k) => LOW_JUMP_KINDS.includes(k));
  }
  if (opts?.midOnly) {
    available = available.filter(
      (k) => !LOW_JUMP_KINDS.includes(k) && !OBSTACLE_KINDS[k].wide,
    );
  }
  if (available.length === 0) return 'chair';

  const rampT = Math.min(1, worldTime / 40);
  const weights: Partial<Record<ObstacleKind, number>> = {};
  for (const k of available) {
    let w = BASE_WEIGHT[k] || 2;
    if (HARD_BOOST[k]) w += (HARD_BOOST[k] as number) * rampT;
    if (OBSTACLE_KINDS[k].wide && worldTime < 14) w *= 0.35;
    // Early game bias toward readable house junk
    if (worldTime < 10 && (k === 'chair' || k === 'rug' || k === 'toys' || k === 'pillow')) {
      w += 2;
    }
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
  return Math.min(0.42, PAIR_SPAWN_BASE + worldTime * PAIR_SPAWN_RAMP);
}

export function shouldSpawnPair(
  worldTime: number,
  random: RandomFn = Math.random,
): boolean {
  if (worldTime <= 4) return false;
  return random() < pairSpawnChance(worldTime);
}

/**
 * Controlled fair pattern pick.
 * Always leaves ≥1 safe lane (pair only blocks 2).
 */
export function pickSpawnPattern(
  worldTime: number,
  random: RandomFn = Math.random,
): SpawnPattern {
  // Opening stretch: teach jump + single dodge
  if (worldTime < 5) {
    return random() < 0.45 ? 'jump_low' : 'single';
  }
  if (worldTime < 10) {
    const r = random();
    if (r < 0.35) return 'jump_low';
    if (r < 0.55) return 'single_with_bean';
    if (r < 0.78) return 'single';
    return shouldSpawnPair(worldTime, random) ? 'pair' : 'single';
  }
  const r = random();
  if (shouldSpawnPair(worldTime, () => r)) return 'pair';
  if (r < 0.28) return 'jump_low';
  if (r < 0.48) return 'single_with_bean';
  return 'single';
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
    // First wave: close enough to engage within ~4–6s at BASE_SPEED
    return OBSTACLE_START_Z - random() * 3;
  }
  // Mobile-friendly reaction gap: ~0.55–0.75s of travel + padding
  const minGap = Math.max(SAME_LANE_MIN_GAP, speed * 0.55);
  return lastObZ - minGap - random() * 2.2;
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

/** Never block all three lanes — pair always has a safe lane. */
export function isPatternFair(pattern: SpawnPattern, lanesBlocked: number[]): boolean {
  if (lanesBlocked.length === 0) return false;
  if (pattern === 'pair') {
    return lanesBlocked.length === 2 && new Set(lanesBlocked).size === 2;
  }
  return lanesBlocked.length === 1 && lanesBlocked[0]! >= 0 && lanesBlocked[0]! <= 2;
}
