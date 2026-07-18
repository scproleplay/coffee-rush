/**
 * Pure collision predicates (CE-local).
 * Uses simple lane/z/height rules matching the game loop.
 */

export interface BeanHitInput {
  beanLane: number;
  beanZ: number;
  playerLane: number;
  /** Player vertical position (0 = ground) */
  playerY: number;
  /** Max |dz| to collect */
  zRadius?: number;
  /** Min height to collect (must jump a bit) */
  minHeight?: number;
}

export function canCollectBean(b: BeanHitInput): boolean {
  if (b.beanLane !== b.playerLane) return false;
  // Slightly generous Z for wider lane travel / mobile timing
  const zRadius = b.zRadius ?? 0.58;
  const minHeight = b.minHeight ?? 0.18;
  if (Math.abs(b.beanZ) >= zRadius) return false;
  if (b.playerY <= minHeight) return false;
  return true;
}

export interface ObstacleHitInput {
  /** Obstacle is in player's lane (or wide covering it) */
  blocksPlayerLane: boolean;
  /** Obstacle z near player (player at z≈0) */
  obstacleZ: number;
  playerY: number;
  /** How close in z counts as contact */
  zRadius?: number;
  /** If player is above this height, clears the obstacle */
  clearHeight: number;
  /** Invulnerable (boost) */
  invulnerable?: boolean;
}

/**
 * True if this obstacle should end the run.
 * Wide obstacles are pre-resolved into blocksPlayerLane by the caller.
 */
export function isFatalObstacleHit(o: ObstacleHitInput): boolean {
  if (o.invulnerable) return false;
  if (!o.blocksPlayerLane) return false;
  const zRadius = o.zRadius ?? 0.55;
  if (Math.abs(o.obstacleZ) >= zRadius) return false;
  // Clear by jumping over
  if (o.playerY > o.clearHeight) return false;
  return true;
}

/**
 * Lanes covered by an obstacle.
 * Wide: primary lane plus one neighbor (clamped to 0..2), matching runtime.
 */
export function coveredLanes(obstacleLane: number, wide: boolean): number[] {
  if (!wide) return [obstacleLane];
  const a = obstacleLane === 0 ? 0 : obstacleLane - 1;
  const b = obstacleLane === 2 ? 2 : obstacleLane + 1;
  return a === b ? [a] : [a, b];
}

/** Does this obstacle block the player's lane? */
export function blocksPlayerLane(
  obstacleLane: number,
  playerLane: number,
  wide: boolean,
): boolean {
  return coveredLanes(obstacleLane, wide).includes(playerLane);
}

/** @deprecated use blocksPlayerLane */
export function wideBlocksLane(
  obstacleLane: number,
  playerLane: number,
  wide: boolean,
): boolean {
  return blocksPlayerLane(obstacleLane, playerLane, wide);
}

export function beanRecyclePastCamera(beanZ: number, pastZ = 6): boolean {
  return beanZ > pastZ;
}
