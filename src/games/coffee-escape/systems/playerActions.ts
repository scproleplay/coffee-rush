/**
 * Player action application (CE-local).
 * Uses pure gates from inputLogic / playerMotion / pacingLogic.
 */
import { LANE_X } from '../engine/constants';
import type { GameState } from '../engine/types';
import { canBoost, canChangeLane, canJump } from './inputLogic';
import { applyJumpImpulse } from './playerMotion';
import { startBoost as pureStartBoost } from './pacingLogic';

export function tryJump(state: GameState): boolean {
  if (
    !canJump({
      running: state.running,
      gameOver: state.gameOver,
      onGround: state.player.onGround,
    })
  ) {
    return false;
  }
  const imp = applyJumpImpulse(state.player.onGround);
  if (!imp) return false;
  state.player.vy = imp.vy;
  state.player.onGround = imp.onGround;
  return true;
}

export function tryLane(state: GameState, target: number): boolean {
  if (!canChangeLane({ running: state.running, gameOver: state.gameOver })) {
    return false;
  }
  if (target < 0 || target > 2) return false;
  if (state.player.targetLane === target) return false;
  state.player.targetLane = target;
  state.player.laneFromX = state.player.laneX;
  state.player.laneToX = LANE_X[target];
  state.player.laneSwitchT = 0;
  return true;
}

export function tryBoost(state: GameState): boolean {
  if (
    !canBoost({
      running: state.running,
      gameOver: state.gameOver,
      boostActive: state.boost.active,
      meter: state.boost.meter,
      cost: state.boost.cost,
    })
  ) {
    return false;
  }
  const started = pureStartBoost({
    active: state.boost.active,
    meter: state.boost.meter,
    cost: state.boost.cost,
    duration: state.boost.duration,
  });
  if (!started) return false;
  state.boost.active = started.active;
  state.boost.timer = started.timer;
  return true;
}
