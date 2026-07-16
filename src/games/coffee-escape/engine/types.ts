import type { ObstacleKind } from '../entities/obstacleKinds';
import type { Group, Mesh, Object3D } from 'three';

export interface PlayerState {
  lane: number;
  targetLane: number;
  laneX: number;
  laneFromX: number;
  laneToX: number;
  laneSwitchT: number;
  y: number;
  vy: number;
  onGround: boolean;
  runAnim: number;
  airT?: number;
  /** Remaining jumps before landing (2 on ground: ground + double). */
  jumpsLeft: number;
  /** 1 → 0 visual kick window after a double jump (squash / steam react). */
  doubleJumpReactT: number;
}

/** Transient FX flags attached to GameState by input (not serialized). */
export type DoubleJumpPuffFlag = { _doubleJumpPuff?: boolean };

export interface ObstacleInstance {
  kind: ObstacleKind | string;
  lane: number;
  z: number;
  mesh: Object3D;
  wide: boolean;
  w?: number;
  h?: number;
  d?: number;
}

export interface BeanInstance {
  mesh: Group | Object3D;
  lane: number;
  z: number;
  y: number;
  rot: number;
  active: boolean;
}

export interface BoostState {
  meter: number;
  max: number;
  active: boolean;
  timer: number;
  duration: number;
  cost: number;
}

export interface ParticleRec {
  mesh: Mesh;
  life: number;
  maxLife: number;
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  r?: number;
  color?: string;
}

export interface GameState {
  running: boolean;
  gameOver: boolean;
  score: number;
  best: number;
  speed: number;
  worldTime: number;
  nextSpawn: number;
  lastObZ: number;
  lastObLane: number;
  player: PlayerState;
  obstacles: ObstacleInstance[];
  man: { visible: boolean; z: number; lane: number };
  shake: number;
  flash: number;
  lastTs: number;
  pointerStartX: number | null;
  pointerStartT: number;
  pointerStartY: number | null;
  pointerActive: boolean;
  pointerDidMove: boolean;
  pointerConsumed: boolean;
  pointerFallbackTimer: ReturnType<typeof setTimeout> | null;
  boost: BoostState;
  beans: BeanInstance[];
  nextBean: number;
  motes: Mesh[];
  boostParticles: ParticleRec[];
  nextBoostParticle: number;
  /**
   * Seconds remaining that a jump press is remembered (early double-jump /
   * pre-land buffer). 0 when idle.
   */
  jumpBufferT: number;
}
