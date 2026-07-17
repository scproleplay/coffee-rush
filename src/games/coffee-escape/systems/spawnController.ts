/**
 * Obstacle / bean spawn orchestration (CE-local).
 * Phase 2: controlled fair patterns + denser early action.
 * Pure pick rules live in spawnLogic; this places meshes into the world.
 */
import { LANE_X, OBSTACLE_START_Z } from '../engine/constants';
import type { BeanInstance, GameState, ObstacleInstance } from '../engine/types';
import {
  OBSTACLE_KINDS,
  isObstacleKind,
  type ObstacleKind,
} from '../entities/obstacleKinds';
import {
  firstHiddenObstacle,
  rebuildObstacle,
} from '../entities/obstaclePool';
import {
  pairLanes,
  pickKind,
  pickLane,
  pickSpawnPattern,
  pickZ,
  shouldSpawnPair,
  type SpawnPattern,
} from './spawnLogic';

export interface SpawnController {
  spawnNext: () => void;
  spawnBean: () => void;
}

function isWideKind(kind: string): boolean {
  return isObstacleKind(kind) && !!OBSTACLE_KINDS[kind].wide;
}

export function createSpawnController(state: GameState): SpawnController {
  function placeObstacle(kind: ObstacleKind, lane: number, z: number): boolean {
    const ob = firstHiddenObstacle(state.obstacles);
    if (!ob) return false;
    rebuildObstacle(ob, kind);
    ob.lane = lane;
    ob.z = z;
    ob.mesh.visible = true;
    ob.mesh.position.set(LANE_X[lane] ?? 0, 0, z);
    if (ob.wide) {
      const a = lane === 0 ? 0 : lane === 2 ? 1 : lane;
      const b = lane === 0 ? 1 : lane === 2 ? 2 : Math.min(2, lane + 1);
      const mid = ((LANE_X[a] ?? 0) + (LANE_X[b] ?? 0)) / 2;
      ob.mesh.position.x = mid;
    }
    state.lastObZ = Math.min(state.lastObZ, z);
    state.lastObLane = lane;
    return true;
  }

  /**
   * Bean heights (tuned to steam-puff double jump):
   * - Early: single-jump band (~0.8–1.15) — optional, fair
   * - Later: some high floaters (~1.3–1.55) reward a small double jump, never required
   *   (combo peak is ~2.0; keep pickups well below "ceiling rocket" range)
   */
  function beanHeightForTime(t: number): number {
    if (t < 12) {
      return 0.8 + Math.random() * 0.35;
    }
    // ~30% high floaters after intro; still optional score candy
    if (Math.random() < 0.3) {
      return 1.3 + Math.random() * 0.25;
    }
    return 0.85 + Math.random() * 0.35;
  }

  function spawnBeanAt(lane: number, z: number, y = 1.0): void {
    const b = state.beans.find((x) => !x.active);
    if (!b) return;
    b.lane = lane;
    b.z = z;
    b.y = y;
    b.rot = Math.random() * Math.PI * 2;
    b.active = true;
    b.mesh.visible = true;
    b.mesh.position.set(b.mesh.position.x, b.y, b.z);
  }

  function spawnBean(): void {
    const lane = Math.floor(Math.random() * 3);
    const y = beanHeightForTime(state.worldTime);
    const z =
      state.lastObZ <= -900
        ? OBSTACLE_START_Z - 6 - Math.random() * 4
        : state.lastObZ - 5 - Math.random() * 6;
    spawnBeanAt(lane, z, y);
  }

  function spawnPattern(pattern: SpawnPattern): void {
    const z = pickZ(state.lastObZ, state.speed);
    const t = state.worldTime;
    const sectionId = state.sectionId;

    if (pattern === 'pair') {
      const safe = Math.floor(Math.random() * 3);
      const [l0, l1] = pairLanes(safe);
      let k0 = pickKind(t, Math.random, {
        midOnly: Math.random() < 0.5,
        sectionId,
      });
      let k1 = pickKind(t, Math.random, {
        midOnly: Math.random() < 0.5,
        sectionId,
      });
      if (isWideKind(k0)) k0 = 'chair';
      if (isWideKind(k1)) k1 = 'pillow';
      placeObstacle(k0, l0, z);
      placeObstacle(k1, l1, z - 0.4);
      if (Math.random() < 0.55) {
        spawnBeanAt(safe, z + 4, 0.95 + Math.random() * 0.25);
      }
      return;
    }

    if (pattern === 'jump_low') {
      const lane = pickLane(state.lastObLane);
      const kind = pickKind(t, Math.random, { lowOnly: true, sectionId });
      placeObstacle(kind, lane, z);
      // Bean after hazard — single-jump height early; optional high later
      if (Math.random() < 0.7) {
        spawnBeanAt(lane, z - 3.5, beanHeightForTime(t));
      }
      return;
    }

    if (pattern === 'single_with_bean') {
      const lane = pickLane(state.lastObLane);
      let kind = pickKind(t, Math.random, { sectionId });
      if (isWideKind(kind)) kind = 'chair';
      placeObstacle(kind, lane, z);
      // Bean on SAFE lane — never forces a jump over the obstacle to score
      const safeChoices = [0, 1, 2].filter((l) => l !== lane);
      const safe = safeChoices[Math.floor(Math.random() * safeChoices.length)]!;
      spawnBeanAt(safe, z + 2.5, beanHeightForTime(t));
      return;
    }

    // single
    const lane = pickLane(state.lastObLane);
    let kind = pickKind(t, Math.random, { sectionId });
    if (t < 12 && isWideKind(kind)) kind = 'chair';
    placeObstacle(kind, lane, z);
    if (Math.random() < 0.35) {
      const safeChoices = [0, 1, 2].filter((l) => l !== lane);
      const safe = safeChoices[Math.floor(Math.random() * safeChoices.length)]!;
      spawnBeanAt(safe, z + 3, beanHeightForTime(t));
    }
  }

  function spawnNext(): void {
    const pattern = pickSpawnPattern(state.worldTime);
    if (pattern === 'pair' && !shouldSpawnPair(state.worldTime)) {
      spawnPattern('single');
      return;
    }
    spawnPattern(pattern);
  }

  return { spawnNext, spawnBean };
}

type DustSlot = {
  mesh: {
    visible: boolean;
    position: { set: (x: number, y: number, z: number) => void };
    material?: { color?: { set?: (c: string | number) => void } };
  };
  life: number;
  maxLife: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  color: string;
};

/** Activate a dust / spark burst around a world position. */
export function burstDustAt(
  dustPool: DustSlot[],
  x: number,
  y: number,
  z: number,
  count = 6,
  color = '#ffd24a',
  opts?: { speed?: number; life?: number; lift?: number },
): void {
  const speed = opts?.speed ?? 1.5;
  const life = opts?.life ?? 0.5;
  const lift = opts?.lift ?? 1.5;
  for (let i = 0; i < count; i++) {
    const dust = dustPool.find((d) => d.life <= 0);
    if (!dust) break;
    dust.life = life;
    dust.maxLife = life;
    dust.x = x + (Math.random() - 0.5) * 0.12;
    dust.y = y + (Math.random() - 0.5) * 0.08;
    dust.z = z + (Math.random() - 0.5) * 0.12;
    const a = Math.random() * Math.PI * 2;
    const s = speed + Math.random() * speed;
    dust.vx = Math.cos(a) * s;
    dust.vy = lift + Math.random() * lift;
    dust.vz = Math.sin(a) * s * 0.6;
    dust.r = 0.14 + Math.random() * 0.1;
    dust.color = color;
    try {
      dust.mesh.material?.color?.set?.(color);
    } catch {
      /* ignore material shape */
    }
    dust.mesh.visible = true;
    dust.mesh.position.set(dust.x, dust.y, dust.z);
  }
}

/** Soft steam puffs for double jump. */
export function burstSteamAt(
  dustPool: DustSlot[],
  x: number,
  y: number,
  z: number,
  count = 8,
): void {
  burstDustAt(dustPool, x, y, z, count, '#f0f6ff', {
    speed: 0.9,
    life: 0.42,
    lift: 2.2,
  });
}

export function emitBoostParticleAt(
  particles: GameState['boostParticles'],
  cupX: number,
): void {
  const p = particles.find((x) => x.life <= 0);
  if (!p) return;
  p.life = p.maxLife;
  p.mesh.position.set(
    cupX + (Math.random() - 0.5) * 0.35,
    0.25 + Math.random() * 0.55,
    0.15 + Math.random() * 0.35,
  );
  p.vy = 1.4 + Math.random() * 1.1;
  // @ts-expect-error material shape
  if (p.mesh.material?.opacity != null) p.mesh.material.opacity = 0.85;
  // @ts-expect-error material shape
  if (p.mesh.material?.color?.set) p.mesh.material.color.set(0x7ad4ff);
  p.mesh.scale.setScalar(0.7 + Math.random() * 0.35);
  p.mesh.visible = true;
}

export type { BeanInstance, ObstacleInstance };
