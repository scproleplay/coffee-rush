import type { Scene } from 'three';
import {
  OBSTACLE_POOL_SIZE,
  OBSTACLE_START_Z,
} from '../engine/constants';
import type { ObstacleInstance } from '../engine/types';
import { buildObstacleMeshes } from './buildObstacleMeshes';
import {
  OBSTACLE_KINDS,
  type ObstacleKind,
  isObstacleKind,
} from './obstacleKinds';

export function makeObstacle(kind: string): ObstacleInstance {
  const k = (isObstacleKind(kind) ? kind : 'chair') as ObstacleKind;
  const mesh = buildObstacleMeshes(k);
  return {
    kind: k,
    lane: 1,
    z: OBSTACLE_START_Z,
    mesh,
    wide: !!OBSTACLE_KINDS[k]?.wide,
  };
}

/** Pre-allocate a pool of obstacles so we never create/destroy mid-run. */
export function initObstaclePool(
  scene: Scene,
  into: ObstacleInstance[],
): void {
  const kinds = Object.keys(OBSTACLE_KINDS);
  for (let i = 0; i < OBSTACLE_POOL_SIZE; i++) {
    const kind = kinds[i % kinds.length]!;
    const ob = makeObstacle(kind);
    ob.mesh.visible = false;
    scene.add(ob.mesh);
    into.push(ob);
  }
}

/** Clear mesh children and rebuild for a new kind. */
export function rebuildObstacle(ob: ObstacleInstance, kind: string): void {
  const k = (isObstacleKind(kind) ? kind : 'chair') as ObstacleKind;
  while (ob.mesh.children.length) {
    const c = ob.mesh.children.pop();
    if (!c) break;
    // @ts-expect-error dispose if present
    if (c.geometry) c.geometry.dispose();
    // @ts-expect-error dispose if present
    if (c.material) {
      // @ts-expect-error material may be array
      if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose?.());
      // @ts-expect-error
      else c.material.dispose?.();
    }
  }
  ob.kind = k;
  ob.wide = !!OBSTACLE_KINDS[k]?.wide;
  const fresh = buildObstacleMeshes(k);
  while (fresh.children.length) {
    ob.mesh.add(fresh.children[0]!);
  }
}

export function firstHiddenObstacle(
  obstacles: ObstacleInstance[],
): ObstacleInstance | undefined {
  return obstacles.find((o) => !o.mesh.visible);
}
