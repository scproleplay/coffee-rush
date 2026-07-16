/**
 * Run start / reset / game-over UI + state reset (CE-local).
 */
import type { PerspectiveCamera } from 'three';
import {
  BASE_SPEED,
  LANE_X,
  MAX_JUMPS,
  STORAGE_KEY,
} from '../engine/constants';
import type { GameState } from '../engine/types';
import { isNewBest, pickGameOverTitle } from '../systems/gameFlow';
import type { CeDom } from './domRefs';
import type { LeaderboardFormApi } from './leaderboardForm';

export function loadBestIntoState(state: GameState): void {
  try {
    const v = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    state.best = Number.isFinite(v) ? v : 0;
  } catch {
    state.best = 0;
  }
}

export function saveBestValue(v: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(v));
  } catch {
    /* ignore */
  }
}

export function updateBestDisplays(dom: CeDom, best: number): void {
  if (dom.BEST_HUD_EL) dom.BEST_HUD_EL.textContent = String(best);
  if (dom.BEST_START_EL) dom.BEST_START_EL.textContent = String(best);
}

export function showStart(dom: CeDom): void {
  if (dom.START_OVERLAY) dom.START_OVERLAY.hidden = false;
  if (dom.GAME_OVER_OVERLAY) dom.GAME_OVER_OVERLAY.hidden = true;
}

export interface ResetWorldDeps {
  state: GameState;
  clearPointer: () => void;
  dustPool: Array<{ life: number; mesh: { visible: boolean } }>;
  camera: PerspectiveCamera;
  scoreEl: HTMLElement | null;
}

export function resetWorld(deps: ResetWorldDeps): void {
  const { state } = deps;
  state.running = false;
  state.gameOver = false;
  state.score = 0;
  state.worldTime = 0;
  state.speed = BASE_SPEED;
  // Match Phase 2 early engagement (first obstacle soon after start)
  state.nextSpawn = 0.55;
  state.lastObZ = -999;
  state.lastObLane = -1;
  state.distance = 0;
  state.sectionId = 'living';
  state.sectionCycle = 0;
  state.shake = 0;
  state.flash = 0;
  deps.clearPointer();
  state.player.lane = 1;
  state.player.targetLane = 1;
  state.player.laneX = LANE_X[1];
  state.player.laneFromX = LANE_X[1];
  state.player.laneToX = LANE_X[1];
  state.player.laneSwitchT = 1;
  state.player.y = 0;
  state.player.vy = 0;
  state.player.onGround = true;
  state.player.runAnim = 0;
  state.player.airT = 0;
  state.player.jumpsLeft = MAX_JUMPS;
  state.player.doubleJumpReactT = 0;
  state.player.doubleBoostLeft = 0;
  state.jumpBufferT = 0;
  for (const o of state.obstacles) o.mesh.visible = false;
  state.boost.meter = 0;
  state.boost.active = false;
  state.boost.timer = 0;
  for (const b of state.beans) {
    b.active = false;
    b.mesh.visible = false;
  }
  state.nextBean = 1.6;
  for (const p of state.boostParticles) {
    p.life = 0;
    p.mesh.visible = false;
  }
  for (const d of deps.dustPool) {
    d.life = 0;
    d.mesh.visible = false;
  }
  deps.camera.fov = 70;
  deps.camera.updateProjectionMatrix();
  if (deps.scoreEl) deps.scoreEl.textContent = '0';
}

export interface GameOverUiDeps {
  state: GameState;
  dom: CeDom;
  lb: LeaderboardFormApi;
}

export function presentGameOver(deps: GameOverUiDeps): void {
  const { state, dom, lb } = deps;
  state.running = false;
  state.gameOver = true;
  if (dom.HUD) dom.HUD.hidden = true;
  const newBest = isNewBest(state.score, state.best);
  if (newBest) {
    state.best = state.score;
    saveBestValue(state.best);
  }
  updateBestDisplays(dom, state.best);
  if (dom.FINAL_SCORE_ITEM) dom.FINAL_SCORE_ITEM.classList.remove('is-best');
  if (dom.FINAL_BEST_ITEM) dom.FINAL_BEST_ITEM.classList.remove('is-best');
  if (dom.FINAL_SCORE_EL) dom.FINAL_SCORE_EL.textContent = '0';
  if (dom.FINAL_BEST_EL) dom.FINAL_BEST_EL.textContent = '0';
  if (dom.NEW_BEST_EL) dom.NEW_BEST_EL.hidden = !newBest;
  if (dom.OVER_TITLE_EL) {
    dom.OVER_TITLE_EL.textContent = pickGameOverTitle(state.score);
  }
  if (dom.GAME_OVER_OVERLAY) dom.GAME_OVER_OVERLAY.hidden = false;
  if (!lb.wasSubmitted()) lb.show();
  else lb.hide();

  const finalScore = state.score;
  const finalBest = state.best;
  const startT = performance.now();
  const dur = 700;
  function tick(): void {
    const t = Math.min(1, (performance.now() - startT) / dur);
    const e = 1 - Math.pow(1 - t, 3);
    if (dom.FINAL_SCORE_EL) {
      dom.FINAL_SCORE_EL.textContent = String(Math.floor(finalScore * e));
    }
    if (dom.FINAL_BEST_EL) {
      dom.FINAL_BEST_EL.textContent = String(Math.floor(finalBest * e));
    }
    if (t < 1) requestAnimationFrame(tick);
    else {
      if (dom.FINAL_SCORE_EL) dom.FINAL_SCORE_EL.textContent = String(finalScore);
      if (dom.FINAL_BEST_EL) dom.FINAL_BEST_EL.textContent = String(finalBest);
      if (newBest) {
        if (dom.FINAL_BEST_ITEM) dom.FINAL_BEST_ITEM.classList.add('is-best');
        if (dom.FINAL_SCORE_EL) {
          dom.FINAL_SCORE_EL.classList.add('is-best');
          dom.FINAL_SCORE_EL.classList.remove('final');
        }
      }
    }
  }
  requestAnimationFrame(tick);
}

export function flashRunStamp(
  runStamp: HTMLElement | null,
  label?: string,
): void {
  if (!runStamp) return;
  if (label) runStamp.textContent = label;
  runStamp.classList.remove('is-show');
  void runStamp.offsetWidth;
  runStamp.classList.add('is-show');
  setTimeout(() => runStamp.classList.remove('is-show'), 1100);
}
