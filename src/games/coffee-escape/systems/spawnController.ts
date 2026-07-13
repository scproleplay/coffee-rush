/**
 * Obstacle / bean spawn orchestration (CE-local).
 * Pure pick rules live in spawnLogic; this places meshes into the world.
 */
import {
  BEAN_SPAWN_CHANCE,
  LANE_X,
  OBSTACLE_START_Z,
} from '../engine/constants';
import type { BeanInstance, GameState, ObstacleInstance } from '../engine/types';
import {
  firstHiddenObstacle,
  rebuildObstacle,
} from '../entities/obstaclePool';
import {
  pickKind,
  pickLane,
  pickZ,
  shouldSpawnPair,
} from './spawnLogic';

export interface SpawnController {
  spawnNext: () => void;
  spawnBean: () => void;
  spawnSingleObstacle: () => void;
  spawnObstaclePair: () => void;
}

export function createSpawnController(state: GameState): SpawnController {
  function spawnBean(): void {
    const b = state.beans.find((x) => !x.active);
    if (!b) return;
    b.lane = Math.floor(Math.random() * 3);
    b.z = -55 - Math.random() * 10;
    b.y = 0.9 + Math.random() * 0.4;
    b.rot = Math.random() * Math.PI * 2;
    b.active = true;
    b.mesh.visible = true;
  }

  function spawnSingleObstacle(): void {
    const ob = firstHiddenObstacle(state.obstacles);
    if (!ob) return;
    const kind = pickKind(state.worldTime);
    rebuildObstacle(ob, kind);
    const lane = pickLane(state.lastObLane);
    const z = pickZ(state.lastObZ, state.speed);
    ob.lane = lane;
    ob.z = z;
    ob.mesh.position.set(LANE_X[lane], 0, z);
    ob.mesh.visible = true;
    state.lastObZ = z;
    state.lastObLane = lane;
  }

  function spawnObstaclePair(): void {
    const safeLane = Math.floor(Math.random() * 3);
    const lanesForObs = [0, 1, 2].filter((l) => l !== safeLane);
    const baseZ = OBSTACLE_START_Z - Math.random() * 3;
    for (let i = 0; i < 2; i++) {
      const ob = firstHiddenObstacle(state.obstacles);
      if (!ob) continue;
      const kind = pickKind(state.worldTime);
      rebuildObstacle(ob, kind);
      const lane = lanesForObs[i]!;
      const z = baseZ - i * 3.5;
      ob.lane = lane;
      ob.z = z;
      ob.mesh.position.set(LANE_X[lane], 0, z);
      ob.mesh.visible = true;
    }
    state.lastObLane = lanesForObs[1] ?? safeLane;
    state.lastObZ = baseZ;
  }

  function spawnNext(): void {
    if (shouldSpawnPair(state.worldTime)) spawnObstaclePair();
    else spawnSingleObstacle();
    if (Math.random() < BEAN_SPAWN_CHANCE) spawnBean();
  }

  return { spawnNext, spawnBean, spawnSingleObstacle, spawnObstaclePair };
}

/** Activate a dust burst around a world position (bean collect FX). */
export function burstDustAt(
  dustPool: Array<{
    mesh: { visible: boolean; position: { set: (x: number, y: number, z: number) => void } };
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
  }>,
  x: number,
  y: number,
  z: number,
  count = 6,
): void {
  for (let i = 0; i < count; i++) {
    const dust = dustPool.find((d) => d.life <= 0);
    if (!dust) break;
    dust.life = 0.5;
    dust.maxLife = 0.5;
    dust.x = x;
    dust.y = y;
    dust.z = z;
    const a = Math.random() * Math.PI * 2;
    const s = 1.5 + Math.random() * 1.5;
    dust.vx = Math.cos(a) * s;
    dust.vy = 1.5 + Math.random() * 1.5;
    dust.vz = Math.sin(a) * s;
    dust.r = 0.18;
    dust.color = '#ffd24a';
    dust.mesh.visible = true;
  }
}

export function emitBoostParticleAt(
  particles: GameState['boostParticles'],
  cupX: number,
): void {
  const p = particles.find((x) => x.life <= 0);
  if (!p) return;
  p.life = p.maxLife;
  p.mesh.position.set(
    cupX + (Math.random() - 0.5) * 0.2,
    0.4 + Math.random() * 0.4,
    0.3 + Math.random() * 0.2,
  );
  p.vy = 1.2 + Math.random() * 0.8;
  // material opacity if present
  // @ts-expect-error material shape
  if (p.mesh.material?.opacity != null) p.mesh.material.opacity = 0.8;
  p.mesh.scale.setScalar(0.8);
  p.mesh.visible = true;
}

export type { BeanInstance, ObstacleInstance };
