/**
 * Player action application (CE-local).
 * Uses pure gates from inputLogic / playerMotion / pacingLogic.
 */
import { LANE_X, MAX_JUMPS } from '../engine/constants';
import type { GameState } from '../engine/types';
import { canBoost, canChangeLane, canJump } from './inputLogic';
import { applyJumpImpulse } from './playerMotion';
import { startBoost as pureStartBoost } from './pacingLogic';

export type JumpResult = {
  ok: boolean;
  isDouble: boolean;
};

export function tryJump(state: GameState): JumpResult {
  if (
    !canJump({
      running: state.running,
      gameOver: state.gameOver,
      onGround: state.player.onGround,
      jumpsLeft: state.player.jumpsLeft,
    })
  ) {
    return { ok: false, isDouble: false };
  }
  const imp = applyJumpImpulse(state.player.jumpsLeft, state.player.onGround);
  if (!imp) return { ok: false, isDouble: false };
  state.player.vy = imp.vy;
  state.player.onGround = imp.onGround;
  state.player.jumpsLeft = imp.jumpsLeft;
  // Fresh air timer on double so tilt feels snappy
  if (imp.isDouble) {
    state.player.airT = 0;
  }
  return { ok: true, isDouble: imp.isDouble };
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

/** Reset jump budget on landing (call from updateFrame). */
export function refreshJumpsOnLand(state: GameState, justLanded: boolean): void {
  if (justLanded || state.player.onGround) {
    if (state.player.onGround) {
      state.player.jumpsLeft = MAX_JUMPS;
    }
  }
}
