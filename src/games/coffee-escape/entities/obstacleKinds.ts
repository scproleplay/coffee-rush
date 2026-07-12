/** Obstacle metadata — pure data, no Three.js. */
export type ObstacleKind =
  | 'spill'
  | 'cable'
  | 'mug'
  | 'chair'
  | 'box'
  | 'plant'
  | 'printer'
  | 'watercooler'
  | 'filingcabinet'
  | 'desk'
  | 'worker';

export interface ObstacleKindMeta {
  wide: boolean;
  jumpHeight: number;
  color: number;
}

export const OBSTACLE_KINDS: Record<ObstacleKind, ObstacleKindMeta> = {
  spill: { wide: false, jumpHeight: 0.35, color: 0x3a1f08 },
  cable: { wide: false, jumpHeight: 0.30, color: 0x1a1a1a },
  mug: { wide: false, jumpHeight: 0.35, color: 0xffffff },
  chair: { wide: false, jumpHeight: 0.55, color: 0x7d3f1c },
  box: { wide: false, jumpHeight: 0.55, color: 0xcaa274 },
  plant: { wide: false, jumpHeight: 0.55, color: 0x4a8a3a },
  printer: { wide: false, jumpHeight: 0.60, color: 0xd4a574 },
  watercooler: { wide: false, jumpHeight: 0.90, color: 0x8a6a3a },
  filingcabinet: { wide: false, jumpHeight: 0.85, color: 0xb8a088 },
  desk: { wide: true, jumpHeight: 0.50, color: 0x8a4a1f },
  worker: { wide: true, jumpHeight: 0.55, color: 0xa04a2a },
};

export function isObstacleKind(k: string): k is ObstacleKind {
  return Object.prototype.hasOwnProperty.call(OBSTACLE_KINDS, k);
}
