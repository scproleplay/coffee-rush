/**
 * Initial run state factory (CE-local).
 * Keeps runtime free of the large state object literal.
 */
import {
  BASE_SPEED,
  LANE_X,
  SPAWN_INTERVAL_START,
} from './constants';
import type { GameState } from './types';

export function createInitialState(): GameState {
  return {
    running: false,
    gameOver: false,
    score: 0,
    best: 0,
    speed: BASE_SPEED,
    worldTime: 0,
    nextSpawn: SPAWN_INTERVAL_START,
    lastObZ: -999,
    lastObLane: -1,
    player: {
      lane: 1,
      targetLane: 1,
      laneX: LANE_X[1],
      laneFromX: LANE_X[1],
      laneToX: LANE_X[1],
      laneSwitchT: 1,
      y: 0,
      vy: 0,
      onGround: true,
      runAnim: 0,
      airT: 0,
    },
    obstacles: [],
    man: { visible: true, z: 6, lane: 0 },
    shake: 0,
    flash: 0,
    lastTs: 0,
    pointerStartX: null,
    pointerStartT: 0,
    pointerStartY: null,
    pointerActive: false,
    pointerDidMove: false,
    pointerConsumed: false,
    pointerFallbackTimer: null,
    boost: {
      meter: 0,
      max: 100,
      active: false,
      timer: 0,
      duration: 1.5,
      cost: 30,
    },
    beans: [],
    nextBean: 2.5,
    motes: [],
    boostParticles: [],
    nextBoostParticle: 0,
  };
}
