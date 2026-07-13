/**
 * Input controller — attaches keyboard/pointer/button listeners (CE-local).
 * Pure decisions live in inputLogic + pointerGestures.
 */
import type { GameState } from '../engine/types';
import { keyToAction } from './inputLogic';
import { tryBoost, tryJump, tryLane } from './playerActions';
import {
  createTapDedupe,
  resolveStagePointerEnd,
} from './pointerGestures';

export interface InputControllerDeps {
  state: GameState;
  canvas: HTMLCanvasElement;
  stage: HTMLElement;
  jumpBtn: HTMLElement | null;
  boostBtn: HTMLElement | null;
  /** true when start overlay is visible */
  isStartVisible: () => boolean;
  onBeginRun: () => void;
  onRestart: () => void;
}

export interface InputController {
  dispose: () => void;
  /** clear pointer fallback when resetting a run */
  clearPointer: () => void;
}

export function attachInputController(deps: InputControllerDeps): InputController {
  const { state, canvas, stage, jumpBtn, boostBtn } = deps;

  function applyLaneDelta(delta: -1 | 1): void {
    tryLane(state, state.player.targetLane + delta);
  }

  function applyGesture(
    g: ReturnType<typeof resolveStagePointerEnd>,
  ): void {
    if (g.type === 'jump') tryJump(state);
    else if (g.type === 'lane') applyLaneDelta(g.delta);
  }

  function onKeyDown(e: KeyboardEvent): void {
    const action = keyToAction(e.code, e.key);
    if (action.type === 'jump') {
      e.preventDefault();
      tryJump(state);
    } else if (action.type === 'lane') {
      e.preventDefault();
      applyLaneDelta(action.delta);
    } else if (action.type === 'boost') {
      e.preventDefault();
      tryBoost(state);
    } else if (e.code === 'Enter') {
      if (!state.running && !state.gameOver && deps.isStartVisible()) {
        e.preventDefault();
        deps.onBeginRun();
      } else if (state.gameOver) {
        e.preventDefault();
        deps.onRestart();
      }
    }
  }

  function processPointerEnd(
    endX: number,
    endY: number,
    forceTap: boolean,
  ): void {
    state.pointerActive = false;
    state.pointerConsumed = true;
    if (state.pointerFallbackTimer) {
      clearTimeout(state.pointerFallbackTimer);
      state.pointerFallbackTimer = null;
    }
    const dx = endX - (state.pointerStartX || 0);
    const dy = endY - (state.pointerStartY || 0);
    const elapsed = forceTap
      ? 0
      : performance.now() - (state.pointerStartT || 0);
    const rect = canvas.getBoundingClientRect();
    const localX = (endX || state.pointerStartX || 0) - rect.left;
    const gesture = resolveStagePointerEnd({
      dx,
      dy,
      elapsedMs: elapsed,
      didMove: state.pointerDidMove,
      localX,
      canvasWidth: rect.width,
      forceTap,
    });
    applyGesture(gesture);
  }

  function onStagePointerDown(e: PointerEvent): void {
    const t = e.target as HTMLElement | null;
    if (t?.closest?.('button, a')) return;
    if (!state.running || state.gameOver) return;
    e.preventDefault();
    state.pointerStartX = e.clientX;
    state.pointerStartY = e.clientY;
    state.pointerStartT = performance.now();
    state.pointerActive = true;
    state.pointerDidMove = false;
    state.pointerConsumed = false;
    if (state.pointerFallbackTimer) {
      clearTimeout(state.pointerFallbackTimer);
    }
    state.pointerFallbackTimer = setTimeout(() => {
      if (state.pointerActive && !state.pointerConsumed) {
        processPointerEnd(
          state.pointerStartX || 0,
          state.pointerStartY || 0,
          true,
        );
      }
    }, 250);
  }

  function onStagePointerMove(e: PointerEvent): void {
    if (!state.pointerActive) return;
    const dx = e.clientX - (state.pointerStartX || 0);
    const dy = e.clientY - (state.pointerStartY || 0);
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) state.pointerDidMove = true;
  }

  function onStagePointerUp(e: PointerEvent): void {
    if (!state.pointerActive) return;
    processPointerEnd(e.clientX, e.clientY, false);
  }

  function onStagePointerCancel(): void {
    if (!state.pointerActive) return;
    state.pointerActive = false;
    if (state.pointerFallbackTimer) {
      clearTimeout(state.pointerFallbackTimer);
      state.pointerFallbackTimer = null;
    }
  }

  const wrap = createTapDedupe(500);
  window.addEventListener('keydown', onKeyDown);
  stage.addEventListener('pointerdown', onStagePointerDown);
  stage.addEventListener('pointermove', onStagePointerMove);
  stage.addEventListener('pointerup', onStagePointerUp);
  stage.addEventListener('pointercancel', onStagePointerCancel);
  stage.addEventListener('pointerleave', onStagePointerCancel);

  const onJump = wrap(() => tryJump(state));
  const onBoost = wrap(() => tryBoost(state));
  if (jumpBtn) {
    jumpBtn.addEventListener('click', onJump);
    jumpBtn.addEventListener('pointerdown', onJump);
  }
  if (boostBtn) {
    boostBtn.addEventListener('click', onBoost);
    boostBtn.addEventListener('pointerdown', onBoost);
  }

  return {
    clearPointer() {
      if (state.pointerFallbackTimer) {
        clearTimeout(state.pointerFallbackTimer);
        state.pointerFallbackTimer = null;
      }
      state.pointerActive = false;
      state.pointerConsumed = false;
    },
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      stage.removeEventListener('pointerdown', onStagePointerDown);
      stage.removeEventListener('pointermove', onStagePointerMove);
      stage.removeEventListener('pointerup', onStagePointerUp);
      stage.removeEventListener('pointercancel', onStagePointerCancel);
      stage.removeEventListener('pointerleave', onStagePointerCancel);
      if (jumpBtn) {
        jumpBtn.removeEventListener('click', onJump);
        jumpBtn.removeEventListener('pointerdown', onJump);
      }
      if (boostBtn) {
        boostBtn.removeEventListener('click', onBoost);
        boostBtn.removeEventListener('pointerdown', onBoost);
      }
      this.clearPointer();
    },
  };
}
