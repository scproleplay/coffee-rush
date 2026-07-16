/**
 * Player action application (CE-local).
 * Uses pure gates from inputLogic / playerMotion / pacingLogic.
 */
import { JUMP_BUFFER_SEC, LANE_X, MAX_JUMPS } from '../engine/constants';
import type { GameState } from '../engine/types';
import { canBoost, canChangeLane, canJump } from './inputLogic';
import { applyJumpImpulse } from './playerMotion';
import { startBoost as pureStartBoost } from './pacingLogic';

export type JumpResult = {
  ok: boolean;
  isDouble: boolean;
};

/**
 * Try a jump immediately. If not currently allowed, buffer the press so it
 * fires as soon as a double-jump (or ground jump) becomes available.
 */
export function tryJump(state: GameState): JumpResult {
  if (state.running && !state.gameOver) {
    // Always refresh buffer so rapid swipes feel responsive
    state.jumpBufferT = JUMP_BUFFER_SEC;
  }

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

  return applyJumpNow(state);
}

/** Consume a pending buffered jump if the player can jump this frame. */
export function consumeJumpBuffer(state: GameState, dt: number): JumpResult {
  if (state.jumpBufferT > 0) {
    state.jumpBufferT = Math.max(0, state.jumpBufferT - dt);
  }
  if (state.jumpBufferT <= 0) return { ok: false, isDouble: false };
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
  return applyJumpNow(state);
}

function applyJumpNow(state: GameState): JumpResult {
  const imp = applyJumpImpulse(
    state.player.jumpsLeft,
    state.player.onGround,
    state.player.vy,
  );
  if (!imp) return { ok: false, isDouble: false };
  state.player.vy = imp.vy;
  state.player.onGround = imp.onGround;
  state.player.jumpsLeft = imp.jumpsLeft;
  state.player.doubleBoostLeft = imp.doubleBoostLeft;
  // Clear buffer so one press doesn't fire twice
  state.jumpBufferT = 0;
  if (imp.isDouble) {
    // Keep air timer continuous — no spin reset snap
    state.player.doubleJumpReactT = 1;
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
