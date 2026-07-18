/** Obstacle metadata — pure data, no Three.js. House-chase set (Phase 2). */

export type ObstacleKind =
  | 'spill'
  | 'cable'
  | 'rug'
  | 'books'
  | 'toys'
  | 'chair'
  | 'stool'
  | 'pillow'
  | 'box'
  | 'laundry'
  | 'table'
  | 'doorframe';

export interface ObstacleKindMeta {
  /** Spans two lanes when true */
  wide: boolean;
  /** Player must be above this Y to clear (fair logical height) */
  jumpHeight: number;
  color: number;
  /** Logical hit width (lane units) */
  hitW: number;
  /** Logical hit depth along Z */
  hitD: number;
}

export const OBSTACLE_KINDS: Record<ObstacleKind, ObstacleKindMeta> = {
  // Low trip hazards — jump over (hitW sized for wider lanes, still fair)
  spill: { wide: false, jumpHeight: 0.22, color: 0x3a1f08, hitW: 1.25, hitD: 0.9 },
  cable: { wide: false, jumpHeight: 0.2, color: 0x1a1a1a, hitW: 1.15, hitD: 0.75 },
  rug: { wide: false, jumpHeight: 0.18, color: 0xb85a3a, hitW: 1.3, hitD: 1.0 },
  books: { wide: false, jumpHeight: 0.32, color: 0x3a5a8a, hitW: 1.05, hitD: 0.75 },
  toys: { wide: false, jumpHeight: 0.35, color: 0xe07040, hitW: 1.1, hitD: 0.8 },
  // Mid furniture — clear jump
  chair: { wide: false, jumpHeight: 0.55, color: 0x8a4a22, hitW: 1.15, hitD: 0.9 },
  stool: { wide: false, jumpHeight: 0.5, color: 0xa07040, hitW: 1.0, hitD: 0.8 },
  pillow: { wide: false, jumpHeight: 0.42, color: 0xd08090, hitW: 1.2, hitD: 0.85 },
  box: { wide: false, jumpHeight: 0.55, color: 0xc9a06a, hitW: 1.2, hitD: 0.95 },
  laundry: { wide: false, jumpHeight: 0.58, color: 0xd4a574, hitW: 1.25, hitD: 0.95 },
  // Wide — always leave one safe lane via spawn rules (covers ~two lanes)
  table: { wide: true, jumpHeight: 0.48, color: 0x8a4a1f, hitW: 3.15, hitD: 1.0 },
  doorframe: { wide: true, jumpHeight: 0.52, color: 0x6b4220, hitW: 3.1, hitD: 0.75 },
};

export function isObstacleKind(k: string): k is ObstacleKind {
  return Object.prototype.hasOwnProperty.call(OBSTACLE_KINDS, k);
}

/** Logical collision size for fair hits (visual mesh can be larger). */
export function logicalHitSize(kind: ObstacleKind): {
  w: number;
  h: number;
  d: number;
  clearHeight: number;
} {
  const m = OBSTACLE_KINDS[kind];
  return {
    w: m.hitW,
    h: Math.max(0.2, m.jumpHeight * 1.05),
    d: m.hitD,
    clearHeight: m.jumpHeight,
  };
}
