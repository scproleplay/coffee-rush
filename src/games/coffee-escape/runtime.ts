// @ts-nocheck
/**
 * Coffee Escape runtime — wires modules into the game loop.
 * Prefer extracting pure logic to systems/* (tested) and builders to
 * engine/* + entities/* rather than growing this file.
 */
import * as THREE from 'three';
import {
  BASE_SPEED,
  BEAN_POOL_SIZE,
  LANE_X,
  SPAWN_INTERVAL_START,
} from './engine/constants';
import { submitScore as platformSubmitScore } from '@shared/leaderboard/client';
import { createScene } from './engine/scene';
import { createHallway } from './engine/hallway';
import { createFxPools } from './engine/fxPools';
import { createCup } from './entities/cup';
import { createMan } from './entities/man';
import { makeBean } from './entities/bean';
import { getCeDom } from './ui/domRefs';
import { attachInputController } from './systems/inputController';
import { updateFrame } from './systems/updateFrame';
import { renderFrame } from './systems/renderFrame';
import {
  burstDustAt,
  createSpawnController,
  emitBoostParticleAt,
} from './systems/spawnController';
import { spawnPopup, worldToScreen } from './ui/popups';
import { createLeaderboardForm } from './ui/leaderboardForm';
import {
  flashRunStamp,
  loadBestIntoState,
  presentGameOver,
  resetWorld as resetWorldFn,
  saveBestValue,
  showStart as showStartFn,
  updateBestDisplays as updateBestDisplaysFn,
} from './ui/runLifecycle';
import { initObstaclePool as initObstaclePoolFactory } from './entities/obstaclePool';

function startCoffeeEscape() {

  // DOM
  const dom = getCeDom();
  const {
    STAGE, CANVAS, HUD, SCORE_EL, BEST_HUD_EL, BEST_START_EL,
    FINAL_SCORE_EL, FINAL_BEST_EL, OVER_TITLE_EL, NEW_BEST_EL,
    FINAL_SCORE_ITEM, FINAL_BEST_ITEM, RUN_STAMP,
    LB_FORM, LB_NICK_EL, LB_SUBMIT_BTN, LB_STATUS_EL,
    START_OVERLAY, GAME_OVER_OVERLAY, START_BTN, TRY_AGAIN_BTN,
    RESET_BEST_BTN, JUMP_BTN, BOOST_BTN, BOOST_FILL, BOOST_HUD_FILL, HINT,
  } = dom;

  // -----------------------------------------------------------------------
  // World constants
  // -----------------------------------------------------------------------
  // Three lanes indexed 0/1/2 (left/center/right). The cup's lane is
  // laneX[currentLane] and it interpolates to laneX[targetLane].
  // World constants imported from ./engine/constants
  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------
  const state = {
    running: false,
    gameOver: false,
    score: 0,
    best: 0,
    speed: BASE_SPEED,
    worldTime: 0,         // seconds since run started
    nextSpawn: SPAWN_INTERVAL_START,
    // Last spawned obstacle's z and lane, so we can avoid
    // unavoidable same-lane sequences.
    lastObZ: -999,
    lastObLane: -1,
    // Player
    player: {
      lane: 1,            // 0/1/2
      targetLane: 1,
      laneX: LANE_X[1],   // current rendered x
      laneFromX: LANE_X[1],
      laneToX: LANE_X[1],
      laneSwitchT: 1,     // 0..1 progress through a lane change
      y: 0,               // vertical position (0 = ground, > 0 = air)
      vy: 0,
      onGround: true,
      runAnim: 0,
      // World z is always 0 — the camera follows the cup, the world
      // scrolls past. Obstacles and floor stripes move toward the
      // camera; the cup itself stays put.
    },
    obstacles: [],        // { mesh, lane, z, kind, w, h, d }
    // Trip gag placeholder (commit A: man visible but doesn't trip)
    man: { visible: true, z: 6, lane: 0 },
    shake: 0,
    flash: 0,
    lastTs: 0,
    pointerStartX: null,  // for swipe detection
    pointerStartT: 0,
    pointerStartY: null,
    pointerActive: false,
    pointerDidMove: false,
    pointerConsumed: false,  // true once a tap/swipe has been processed
    pointerFallbackTimer: null,  // 250ms fallback if pointerup doesn't fire
    // Boost: meter fills while running, tap the button (or press
    // Shift) to drain it for ~1.5s. While active, the cup passes
    // through obstacles without game-over.
    boost: {
      meter: 0,           // 0..100
      max: 100,
      active: false,
      timer: 0,           // seconds remaining while active
      duration: 1.5,      // seconds the boost lasts per use
      cost: 30,           // minimum meter required to start a boost
    },
    // Coffee bean collectibles floating in the air. +5 score when
    // collected (you have to jump to reach them).
    beans: [],
    nextBean: 2.5,       // seconds until next bean spawn (more frequent than before)
    // Ambient particles — drifting motes for depth.
    motes: [],
    // Boost particle trail — short-lived blue particles emitted
    // while the boost is active.
    boostParticles: [],
    nextBoostParticle: 0,
  };

    // Scene + hallway (factories — hallway restored & isolated)
  if (!THREE) {
    console.error('Three.js failed to load. Coffee Escape cannot start.');
    return;
  }
  const { scene, camera, renderer, cameraBaseY, cameraBaseZ } = createScene(CANVAS);
  const { floorTex, wallTex, ceilingTex, decorItems, DECOR_SPACING } = createHallway(scene);

  // -----------------------------------------------------------------------
  // Cup + man + beans — CE-local entity factories (not shared platform code)
  // -----------------------------------------------------------------------
  const {
    cup,
    armLGroup,
    armRGroup,
    legLGroup,
    legRGroup,
    steamGroup,
    contactShadow,
  } = createCup(scene, LANE_X[1]);

  const {
    man,
    manArmL,
    manArmR,
    manLegL,
    manLegR,
  } = createMan(scene, LANE_X[0]);

  const beans = [];
  for (let i = 0; i < BEAN_POOL_SIZE; i++) {
    const b = makeBean();
    b.mesh.visible = false;
    scene.add(b.mesh);
    beans.push(b);
  }
  state.beans = beans;

    // FX pools
  const { motes, dustPool, boostParticles, boostGlow } = createFxPools(scene);
  state.motes = motes;
  state.boostParticles = boostParticles;

  // Obstacle pool
  initObstaclePoolFactory(scene, state.obstacles);

  // Spawn controller
  const spawner = createSpawnController(state);
  function spawnNext() { spawner.spawnNext(); }
  function spawnBean() { spawner.spawnBean(); }
  function collectBean(b) {
    b.active = false;
    b.mesh.visible = false;
    state.score += 5;
    state.flash = 0.10;
    burstDustAt(dustPool, b.mesh.position.x, b.mesh.position.y, b.mesh.position.z);
    const screen = worldToScreen(b.mesh.position, camera, STAGE);
    spawnPopup(STAGE, '+5', screen.x, screen.y - 20, '#ffb000');
  }
  function emitBoostParticle() {
    emitBoostParticleAt(state.boostParticles, cup.position.x);
  }

  // Best score helpers
  function loadBest() { loadBestIntoState(state); }
  function saveBest(v) { saveBestValue(v); }
  function updateBestDisplays() { updateBestDisplaysFn(dom, state.best); }

  // Input controller (keyboard / pointer / JUMP / BOOST)
  // beginRun/restart are defined later — use wrappers that call them.
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

  // Leaderboard form
  const lbForm = createLeaderboardForm(
    { LB_FORM, LB_NICK_EL, LB_SUBMIT_BTN, LB_STATUS_EL },
    (payload) => platformSubmitScore(payload),
  );
  function showLeaderboardForm() { lbForm.show(); }
  function hideLeaderboardForm() { lbForm.hide(); }
  function submitToLeaderboard() { lbForm.submit(state.score); }

  // Run lifecycle
  function showStart() { showStartFn(dom); }

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
    hideLeaderboardForm();
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

  // Main loop
  // -----------------------------------------------------------------------
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

  function loop(ts) {
    if (!state.running && !state.gameOver) return;
    if (!state.running) return;
    const dtRaw = (ts - state.lastTs) / 1000;
    const dt = Math.min(dtRaw, 1 / 30);
    state.lastTs = ts;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  // -----------------------------------------------------------------------
  // Update
  // -----------------------------------------------------------------------
  const _playerBox = new THREE.Box3();
  const _obBox = new THREE.Box3();
  const _tmpVec = new THREE.Vector3();

  function update(dt) {
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
      spawnNext,
      spawnBean,
      collectBean,
      emitBoostParticle,
      onCrash: () => { setTimeout(gameOver, 0); },
      scoreEl: SCORE_EL,
      boostFill: BOOST_FILL,
      boostHudFill: BOOST_HUD_FILL,
      boostBtn: BOOST_BTN,
      playerBox: _playerBox,
      obBox: _obBox,
      tmpVec: _tmpVec,
    });
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  function render() {
    renderFrame({ state, renderer, scene, camera, stage: STAGE });
  }

  // -----------------------------------------------------------------------
  // Init
  // -----------------------------------------------------------------------
  function init() {
    loadBest();
    updateBestDisplays();
    // Gameplay keyboard/pointer/JUMP/BOOST: attachInputController (above).
    // Overlay buttons only here.
    STAGE.addEventListener('gesturestart', e => e.preventDefault());
    STAGE.addEventListener('gesturechange', e => e.preventDefault());
    const tapHandler = (action) => {
      let last = 0;
      return (e) => {
        if (e && e.preventDefault) e.preventDefault();
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
        saveBest(0);
        updateBestDisplays();
      });
    }
    if (LB_SUBMIT_BTN) {
      const h = tapHandler(submitToLeaderboard);
      LB_SUBMIT_BTN.addEventListener('click', h);
      LB_SUBMIT_BTN.addEventListener('pointerdown', h);
    }
    if (LB_NICK_EL) {
      LB_NICK_EL.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitToLeaderboard();
        }
      });
    }
    showStart();
    // Initial paint of the 3D scene behind the start overlay so the
    // background isn't blank.
    renderer.render(scene, camera);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }


}

startCoffeeEscape();
