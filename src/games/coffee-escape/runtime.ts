// @ts-nocheck
/**
 * Coffee Escape conductor — wire modules into the loop only.
 * Rules: systems/* · builders: engine/* + entities/* · UI: ui/*
 * Keep this file thin; do not grow game logic here.
 */
import * as THREE from 'three';
import { submitScore as platformSubmitScore } from '@shared/leaderboard/client';
import { BEAN_POOL_SIZE, LANE_X } from './engine/constants';
import { createFxPools } from './engine/fxPools';
import { createHallway } from './engine/hallway';
import { createScene } from './engine/scene';
import { createInitialState } from './engine/state';
import { makeBean } from './entities/bean';
import { createCup } from './entities/cup';
import { createMan } from './entities/man';
import { initObstaclePool } from './entities/obstaclePool';
import { attachInputController } from './systems/inputController';
import { renderFrame } from './systems/renderFrame';
import {
  burstDustAt,
  createSpawnController,
  emitBoostParticleAt,
} from './systems/spawnController';
import { updateFrame } from './systems/updateFrame';
import { getCeDom } from './ui/domRefs';
import { createLeaderboardForm } from './ui/leaderboardForm';
import { spawnPopup, worldToScreen } from './ui/popups';
import {
  flashRunStamp,
  loadBestIntoState,
  presentGameOver,
  resetWorld as resetWorldFn,
  saveBestValue,
  showStart,
  updateBestDisplays,
} from './ui/runLifecycle';

function startCoffeeEscape() {
  const dom = getCeDom();
  const {
    STAGE,
    CANVAS,
    HUD,
    SCORE_EL,
    START_OVERLAY,
    GAME_OVER_OVERLAY,
    START_BTN,
    TRY_AGAIN_BTN,
    RESET_BEST_BTN,
    JUMP_BTN,
    BOOST_BTN,
    BOOST_FILL,
    BOOST_HUD_FILL,
    HINT,
    RUN_STAMP,
    LB_FORM,
    LB_NICK_EL,
    LB_SUBMIT_BTN,
    LB_STATUS_EL,
  } = dom;

  const state = createInitialState();

  if (!THREE) {
    console.error('Three.js failed to load. Coffee Escape cannot start.');
    return;
  }

  const { scene, camera, renderer, cameraBaseY, cameraBaseZ } = createScene(CANVAS);
  const { floorTex, wallTex, ceilingTex, decorItems, DECOR_SPACING } =
    createHallway(scene);

  const {
    cup,
    armLGroup,
    armRGroup,
    legLGroup,
    legRGroup,
    steamGroup,
    contactShadow,
  } = createCup(scene, LANE_X[1]);

  const { man, manArmL, manArmR, manLegL, manLegR } = createMan(scene, LANE_X[0]);

  const beans = [];
  for (let i = 0; i < BEAN_POOL_SIZE; i++) {
    const b = makeBean();
    b.mesh.visible = false;
    scene.add(b.mesh);
    beans.push(b);
  }
  state.beans = beans;

  const { motes, dustPool, boostParticles, boostGlow } = createFxPools(scene);
  state.motes = motes;
  state.boostParticles = boostParticles;

  initObstaclePool(scene, state.obstacles);
  const spawner = createSpawnController(state);

  function collectBean(b) {
    b.active = false;
    b.mesh.visible = false;
    state.score += 5;
    state.flash = 0.1;
    burstDustAt(dustPool, b.mesh.position.x, b.mesh.position.y, b.mesh.position.z);
    const screen = worldToScreen(b.mesh.position, camera, STAGE);
    spawnPopup(STAGE, '+5', screen.x, screen.y - 20, '#ffb000');
  }

  function emitBoostParticle() {
    emitBoostParticleAt(state.boostParticles, cup.position.x);
  }

  let beginRunRef = () => {};
  let restartRef = () => {};
  const inputCtl = attachInputController({
    state,
    canvas: CANVAS,
    stage: STAGE,
    jumpBtn: JUMP_BTN,
    boostBtn: BOOST_BTN,
    isStartVisible: () => !!(START_OVERLAY && !START_OVERLAY.hidden),
    onBeginRun: () => beginRunRef(),
    onRestart: () => restartRef(),
  });

  const lbForm = createLeaderboardForm(
    { LB_FORM, LB_NICK_EL, LB_SUBMIT_BTN, LB_STATUS_EL },
    (payload) => platformSubmitScore(payload),
  );

  function resetWorld() {
    resetWorldFn({
      state,
      clearPointer: () => inputCtl.clearPointer(),
      dustPool,
      camera,
      scoreEl: SCORE_EL,
    });
  }

  function beginRun() {
    resetWorld();
    lbForm.resetSubmitted();
    lbForm.hide();
    state.running = true;
    if (START_OVERLAY) START_OVERLAY.hidden = true;
    if (GAME_OVER_OVERLAY) GAME_OVER_OVERLAY.hidden = true;
    if (HUD) HUD.hidden = false;
    if (HINT) HINT.hidden = false;
    state.lastTs = performance.now();
    flashRunStamp(RUN_STAMP);
    requestAnimationFrame(loop);
  }

  function gameOver() {
    presentGameOver({ state, dom, lb: lbForm });
  }

  function restart() {
    if (GAME_OVER_OVERLAY) GAME_OVER_OVERLAY.hidden = true;
    beginRun();
  }
  beginRunRef = beginRun;
  restartRef = restart;

  function fitCanvas() {
    const rect = STAGE.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(dpr);
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / Math.max(1, rect.height);
    camera.updateProjectionMatrix();
  }
  fitCanvas();
  window.addEventListener('resize', fitCanvas);

  const _playerBox = new THREE.Box3();
  const _obBox = new THREE.Box3();
  const _tmpVec = new THREE.Vector3();

  function loop(ts) {
    if (!state.running) return;
    const dt = Math.min((ts - state.lastTs) / 1000, 1 / 30);
    state.lastTs = ts;
    updateFrame({
      state,
      dt,
      cup,
      armLGroup,
      armRGroup,
      legLGroup,
      legRGroup,
      steamGroup,
      contactShadow,
      man,
      manArmL,
      manArmR,
      manLegL,
      manLegR,
      scene,
      camera,
      cameraBaseY,
      cameraBaseZ,
      floorTex,
      wallTex,
      ceilingTex,
      decorItems,
      DECOR_SPACING,
      boostGlow,
      dustPool,
      spawnNext: () => spawner.spawnNext(),
      spawnBean: () => spawner.spawnBean(),
      collectBean,
      emitBoostParticle,
      onCrash: () => {
        setTimeout(gameOver, 0);
      },
      scoreEl: SCORE_EL,
      boostFill: BOOST_FILL,
      boostHudFill: BOOST_HUD_FILL,
      boostBtn: BOOST_BTN,
      playerBox: _playerBox,
      obBox: _obBox,
      tmpVec: _tmpVec,
    });
    renderFrame({ state, renderer, scene, camera, stage: STAGE });
    requestAnimationFrame(loop);
  }

  function init() {
    loadBestIntoState(state);
    updateBestDisplays(dom, state.best);

    STAGE.addEventListener('gesturestart', (e) => e.preventDefault());
    STAGE.addEventListener('gesturechange', (e) => e.preventDefault());

    const tapHandler = (action) => {
      let last = 0;
      return (e) => {
        if (e?.preventDefault) e.preventDefault();
        const now = performance.now();
        if (now - last < 500) return;
        last = now;
        action();
      };
    };
    const bindTap = (btn, action) => {
      if (!btn) return;
      const h = tapHandler(action);
      btn.addEventListener('click', h);
      btn.addEventListener('pointerdown', h);
    };

    bindTap(START_BTN, beginRun);
    bindTap(TRY_AGAIN_BTN, restart);
    if (RESET_BEST_BTN) {
      RESET_BEST_BTN.addEventListener('click', () => {
        state.best = 0;
        saveBestValue(0);
        updateBestDisplays(dom, 0);
      });
    }
    if (LB_SUBMIT_BTN) {
      const h = tapHandler(() => lbForm.submit(state.score));
      LB_SUBMIT_BTN.addEventListener('click', h);
      LB_SUBMIT_BTN.addEventListener('pointerdown', h);
    }
    if (LB_NICK_EL) {
      LB_NICK_EL.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          lbForm.submit(state.score);
        }
      });
    }

    showStart(dom);
    renderer.render(scene, camera);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

startCoffeeEscape();
