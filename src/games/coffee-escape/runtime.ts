// @ts-nocheck
/**
 * Coffee Escape runtime — wires modules into the game loop.
 * Prefer extracting pure logic to systems/* (tested) and builders to
 * engine/* + entities/* rather than growing this file.
 */
import * as THREE from 'three';
import { submitScore as platformSubmitScore } from '@shared/leaderboard/client';
import {
  STORAGE_KEY,
  LANE_X,
  JUMP_VY,
  OBSTACLE_POOL_SIZE,
  OBSTACLE_START_Z,
  OBSTACLE_END_Z,
  BASE_SPEED,
  SPAWN_INTERVAL_START,
  BEAN_SPAWN_CHANCE,
  BEAN_INTERVAL_MIN,
  BEAN_INTERVAL_MAX,
  BEAN_POOL_SIZE,
} from './engine/constants';
import { createScene } from './engine/scene';
import { createHallway } from './engine/hallway';
import { createFxPools } from './engine/fxPools';
import { OBSTACLE_KINDS } from './entities/obstacleKinds';
import { buildObstacleMeshes } from './entities/buildObstacleMeshes';
import { createCup } from './entities/cup';
import { createMan } from './entities/man';
import { makeBean } from './entities/bean';
import { getCeDom } from './ui/domRefs';
import {
  isKindAvailable,
  nextSpawnDelay,
  pickKind as purePickKind,
  pickLane as purePickLane,
  pickZ as purePickZ,
  shouldSpawnPair,
} from './systems/spawnLogic';
import {
  canBoost,
  canChangeLane,
  canJump,
} from './systems/inputLogic';
import {
  nextBeanDelay,
  scoreFromTime,
  speedAtTime,
  tickBoost,
  startBoost as pureStartBoost,
} from './systems/pacingLogic';
import {
  applyJumpImpulse,
  cupTiltX,
  laneBank,
  tickJump,
  tickLaneMotion,
  tickRunAnim,
} from './systems/playerMotion';
import {
  beanRecyclePastCamera,
  blocksPlayerLane,
  canCollectBean,
} from './systems/collisionLogic';
import { isNewBest, pickGameOverTitle } from './systems/gameFlow';

const PlatformLeaderboard = {
  async submitScore(payload) {
    // Map legacy payload field names if needed
    return platformSubmitScore({
      game: payload.game,
      nickname: payload.nickname,
      score: payload.score,
      reactionTime: payload.reactionTime,
      moves: payload.moves,
      timeSeconds: payload.timeSeconds,
      userId: payload.userId,
    });
  },
};

function startCoffeeEscape() {

  // DOM
  const {
    STAGE, CANVAS, HUD, SCORE_EL, BEST_HUD_EL, BEST_START_EL,
    FINAL_SCORE_EL, FINAL_BEST_EL, OVER_TITLE_EL, NEW_BEST_EL,
    FINAL_SCORE_ITEM, FINAL_BEST_ITEM, RUN_STAMP,
    LB_FORM, LB_NICK_EL, LB_SUBMIT_BTN, LB_STATUS_EL,
    START_OVERLAY, GAME_OVER_OVERLAY, START_BTN, TRY_AGAIN_BTN,
    RESET_BEST_BTN, JUMP_BTN, BOOST_BTN, BOOST_FILL, BOOST_HUD_FILL, HINT,
  } = getCeDom();

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

  // Bean spawn — pick a free bean from the pool and put it in a
  // random lane at a far z. Floats at jump height with a slow bob.
  function spawnBean() {
    const b = state.beans.find(x => !x.active);
    if (!b) return;
    b.lane = Math.floor(Math.random() * 3);
    b.z = -55 - Math.random() * 10;
    b.y = 0.9 + Math.random() * 0.4;
    b.rot = Math.random() * Math.PI * 2;
    b.active = true;
    b.mesh.visible = true;
  }

  // Bean collected — score + small burst, free the bean back to the
  // pool. The "floating +N popup" is reused via spawnPopup, which
  // projects the bean's world position to screen pixels.
  function collectBean(b) {
    b.active = false;
    b.mesh.visible = false;
    state.score += 5;
    state.flash = 0.10;
    // Small gold particle burst
    for (let i = 0; i < 6; i++) {
      const dust = dustPool.find(d => d.life <= 0);
      if (!dust) break;
      dust.life = 0.5;
      dust.maxLife = 0.5;
      dust.x = b.mesh.position.x;
      dust.y = b.mesh.position.y;
      dust.z = b.mesh.position.z;
      const a = Math.random() * Math.PI * 2;
      const s = 1.5 + Math.random() * 1.5;
      dust.vx = Math.cos(a) * s;
      dust.vy = 1.5 + Math.random() * 1.5;
      dust.vz = Math.sin(a) * s;
      dust.r = 0.18;
      dust.color = '#ffd24a';
      dust.mesh.visible = true;
    }
    // Screen-space +5 popup
    const screen = worldToScreen(b.mesh.position);
    spawnPopup('+5', screen.x, screen.y - 20, '#ffb000');
  }

  // Boost particle emission — pick a dead particle, set it just
  // behind the cup, give it upward + slight forward velocity.
  function emitBoostParticle() {
    const p = state.boostParticles.find(x => x.life <= 0);
    if (!p) return;
    p.life = p.maxLife;
    p.mesh.position.set(
      cup.position.x + (Math.random() - 0.5) * 0.2,
      0.4 + Math.random() * 0.4,
      0.3 + Math.random() * 0.2
    );
    p.vy = 1.2 + Math.random() * 0.8;
    p.mesh.material.opacity = 0.8;
    p.mesh.scale.setScalar(0.8);
    p.mesh.visible = true;
  }

  // -----------------------------------------------------------------------
  // Obstacle factory — coffee/office themed obstacles
  // -----------------------------------------------------------------------
  // We define obstacle kinds + their metadata (width, height, wide
  // flag, color) in one place. Each kind is built from primitives.
  // `wide: true` means the obstacle blocks 2 adjacent lanes (the
  // player has to switch lanes to clear it). Other obstacles block
  // a single lane and are cleared by jumping.
  // OBSTACLE_KINDS imported from ./entities/obstacleKinds
  // Tall obstacles (jumpHeight > 0.7) only spawn after 20s of run time.
  function kindAvailable(kind) {
    return isKindAvailable(kind, state.worldTime);
  }
  // buildObstacleMeshes imported from ./entities/buildObstacleMeshes
  function makeObstacle(kind) {
    const mesh = buildObstacleMeshes(kind);
    return {
      kind: kind,
      lane: 1,
      z: OBSTACLE_START_Z,
      mesh: mesh,
      wide: !!OBSTACLE_KINDS[kind] && OBSTACLE_KINDS[kind].wide,
    };
  }

  // Pre-allocate a pool of obstacles so we never create/destroy mid-run.
  function initObstaclePool() {
    const kinds = Object.keys(OBSTACLE_KINDS);
    for (let i = 0; i < OBSTACLE_POOL_SIZE; i++) {
      const kind = kinds[i % kinds.length];
      const ob = makeObstacle(kind);
      ob.mesh.visible = false;
      scene.add(ob.mesh);
      state.obstacles.push(ob);
    }
  }
  initObstaclePool();

  // -----------------------------------------------------------------------
  // Spawn logic
  // -----------------------------------------------------------------------
  // Weighted random pick from OBSTACLE_KINDS, respecting availability
  // (tall obstacles only after 20s of run time). The base weights
  // favor easy kinds. As worldTime increases, the weights shift
  // toward medium/hard kinds (watercooler, filingcabinet) so the
  // hallway gets denser and more varied.
  function pickKind() {
    return purePickKind(state.worldTime);
  }

  function spawnNext() {
    // Pure pair decision — tested in systems/spawnLogic.test.ts
    const isPair = shouldSpawnPair(state.worldTime);
if (isPair) {
      spawnObstaclePair();
    } else {
      spawnSingleObstacle();
    }

    // With a fixed chance, also spawn a bean alongside the obstacle(s)
    // so the hallway always has collectibles between hazards.
    if (Math.random() < BEAN_SPAWN_CHANCE) {
      spawnBean();
    }
  }

  // Spawn a single obstacle. Picks a lane that is different from
  // the last obstacle's lane when possible, and ensures the new
  // z is far enough away that the player has reaction time.
  function spawnSingleObstacle() {
    const ob = state.obstacles.find(o => !o.mesh.visible);
    if (!ob) return;

    const kind = pickKind();
    rebuildObstacle(ob, kind);

    const lane = pickLane(ob);
    const z = pickZ(lane, ob);

    ob.lane = lane;
    ob.z = z;
    ob.mesh.position.set(LANE_X[lane], 0, z);
    ob.mesh.visible = true;
    state.lastObZ = z;
    state.lastObLane = lane;
  }

  // Spawn a pair: two obstacles in two different lanes, with a
  // small z offset between them so the pattern looks staggered
  // (not like a wall). The third lane is always safe.
  function spawnObstaclePair() {
    // Pick which lane is the safe one. The two obstacles go in
    // the other two lanes.
    const safeLane = Math.floor(Math.random() * 3);
    const lanesForObs = [0, 1, 2].filter(l => l !== safeLane);

    // Stagger the two obstacles by a few units in z so they
    // don't look like a single wall. The player still has to
    // commit to the safe lane early.
    const baseZ = OBSTACLE_START_Z - Math.random() * 3;
    for (let i = 0; i < 2; i++) {
      const ob = state.obstacles.find(o => !o.mesh.visible);
      if (!ob) continue;
      const kind = pickKind();
      rebuildObstacle(ob, kind);
      const lane = lanesForObs[i];
      const z = baseZ - i * 3.5; // 3.5-unit stagger between the two
      ob.lane = lane;
      ob.z = z;
      ob.mesh.position.set(LANE_X[lane], 0, z);
      ob.mesh.visible = true;
    }
    // Track the nearer one (larger z) for the next single obstacle's
    // lane-safety check.
    state.lastObLane = lanesForObs[1];
    state.lastObZ = baseZ;
  }

  // Pick a lane for the next obstacle. If the last obstacle is in
  // the same lane and is close in z, pick a different lane so the
  // player has a safe option. Returns 0, 1, or 2.
  function pickLane(_ob) {
    return purePickLane(state.lastObLane);
  }

  // Pick a z position for the new obstacle. We ensure the gap to
  // the last obstacle is at least minGap units so the player has
  // time to react at any speed. The minGap is based on the current
  // speed: at speed 12 we want ~6 units (0.5s reaction time), at
  // speed 36 we want ~14 units (0.39s). This is the "safe lane"
  // guarantee — consecutive obstacles are never closer than
  // ~0.4s of travel.
  function pickZ(_lane, _ob) {
    return purePickZ(state.lastObZ, state.speed);
  }

  function rebuildObstacle(ob, kind) {
    // Clear the old group, then build a fresh one matching the new kind.
    while (ob.mesh.children.length) {
      const c = ob.mesh.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    ob.kind = kind;
    ob.wide = !!(OBSTACLE_KINDS[kind] && OBSTACLE_KINDS[kind].wide);
    // buildObstacleMeshes returns a fresh Group; steal its children.
    const fresh = buildObstacleMeshes(kind);
    while (fresh.children.length) {
      ob.mesh.add(fresh.children[0]);
    }
  }

  // -----------------------------------------------------------------------
  // Best score persistence
  // -----------------------------------------------------------------------
  function loadBest() {
    try {
      const v = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
      state.best = Number.isFinite(v) ? v : 0;
    } catch (e) {
      state.best = 0;
    }
  }
  function saveBest(v) {
    try { localStorage.setItem(STORAGE_KEY, String(v)); } catch (e) { /* ignore */ }
  }
  function updateBestDisplays() {
    BEST_HUD_EL.textContent = String(state.best);
    BEST_START_EL.textContent = String(state.best);
  }

  // -----------------------------------------------------------------------
  // Floating +N popups
  // -----------------------------------------------------------------------
  function spawnPopup(text, x, y, color) {
    const el = document.createElement('div');
    el.className = 'ce-popup';
    el.textContent = text;
    if (color) el.style.color = color;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    STAGE.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  function worldToScreen(worldPos) {
    const v = worldPos.clone().project(camera);
    const rect = STAGE.getBoundingClientRect();
    return {
      x: (v.x * 0.5 + 0.5) * rect.width,
      y: (-v.y * 0.5 + 0.5) * rect.height,
    };
  }

  // -----------------------------------------------------------------------
  // Input
  // -----------------------------------------------------------------------
  // Swipe / tap detection thresholds.
  const SWIPE_MIN_PX = 24;        // minimum drag to count as a swipe
  const SWIPE_MAX_MS = 1000;      // longer than this = drag, not swipe
  const TAP_MAX_MS = 250;         // quick tap (used for zone-based taps)

  function tryJump() {
    if (!canJump({ running: state.running, gameOver: state.gameOver, onGround: state.player.onGround })) return;
    const imp = applyJumpImpulse(state.player.onGround);
    if (!imp) return;
    state.player.vy = imp.vy;
    state.player.onGround = imp.onGround;
  }

  function tryLane(target) {
    if (!canChangeLane({ running: state.running, gameOver: state.gameOver })) return;
    if (target < 0 || target > 2) return;
    if (state.player.targetLane === target) return;
    state.player.targetLane = target;
    state.player.laneFromX = state.player.laneX;
    state.player.laneToX = LANE_X[target];
    state.player.laneSwitchT = 0;
  }

  function tryBoost() {
    if (!canBoost({
      running: state.running,
      gameOver: state.gameOver,
      boostActive: state.boost.active,
      meter: state.boost.meter,
      cost: state.boost.cost,
    })) return;
    const started = pureStartBoost({
      active: state.boost.active,
      meter: state.boost.meter,
      cost: state.boost.cost,
      duration: state.boost.duration,
    });
    if (!started) return;
    state.boost.active = started.active;
    state.boost.timer = started.timer;
  }

  function onKeyDown(e) {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === ' ') {
      e.preventDefault();
      tryJump();
    } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      e.preventDefault();
      tryLane(state.player.targetLane - 1);
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      e.preventDefault();
      tryLane(state.player.targetLane + 1);
    } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.key === 'Shift') {
      e.preventDefault();
      tryBoost();
    } else if (e.code === 'Enter') {
      if (!state.running && !state.gameOver && !START_OVERLAY.hidden) {
        e.preventDefault();
        beginRun();
      } else if (state.gameOver) {
        e.preventDefault();
        restart();
      }
    }
  }

  // Pointer handling on the stage canvas. We support:
  //   - tap on the left/right third of the canvas = lane change
  //   - tap on the center third = jump
  //   - quick swipe left/right = lane change (the tap fires first, so
  //     a quick swipe is the same as a tap in that direction)
  //   - swipe UP = jump
  //   - swipe DOWN = ignored (don't accidentally jump)
  // Tap on the action buttons (JUMP / BOOST) is handled by their own
  // click + pointerdown handlers.
  //
  // Mobile reliability notes (iOS Safari is the worst offender):
  //   - touch-action: none on the stage + canvas prevents the
  //     browser from interpreting touches as pan / zoom, which
  //     would otherwise steal swipes and add a 300ms tap delay.
  //   - We call e.preventDefault() in pointerdown to suppress the
  //     default 300ms-click behavior. This is the standard iOS
  //     fix.
  //   - We use a 250ms fallback timer after pointerdown so a tap
  //     still registers even if pointerup is delayed or
  //     intercepted (e.g. by a system gesture).
  function onStagePointerDown(e) {
    // Skip if the touch is on a real button or link — those have
    // their own handlers. We use closest() so the test works for
    // child elements inside the buttons (e.g. the <span> icon).
    if (e.target.closest && e.target.closest('button, a')) return;
    if (!state.running || state.gameOver) return;
    // Prevent default to kill the iOS 300ms tap delay and any
    // browser scroll/zoom on this touch. This is the most
    // important reliability fix for iOS Safari.
    e.preventDefault();
    // Record the start position and time. The action fires on
    // pointerup OR a 250ms fallback (whichever comes first), so
    // taps always register even if pointerup is suppressed.
    state.pointerStartX = e.clientX;
    state.pointerStartY = e.clientY;
    state.pointerStartT = performance.now();
    state.pointerActive = true;
    state.pointerDidMove = false;
    state.pointerConsumed = false;
    // Clear any previous fallback timer.
    if (state.pointerFallbackTimer) {
      clearTimeout(state.pointerFallbackTimer);
    }
    // Fallback: if pointerup doesn't fire within 250ms, treat
    // the touch as a tap on the spot the user pressed.
    state.pointerFallbackTimer = setTimeout(() => {
      if (state.pointerActive && !state.pointerConsumed) {
        processPointerEnd(state.pointerStartX, state.pointerStartY, 0);
      }
    }, 250);
  }

  function onStagePointerMove(e) {
    if (!state.pointerActive) return;
    const dx = (e.clientX || 0) - (state.pointerStartX || 0);
    const dy = (e.clientY || 0) - (state.pointerStartY || 0);
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) state.pointerDidMove = true;
  }

  // Shared action handler. Called from onStagePointerUp AND from
  // the 250ms fallback timer in onStagePointerDown. dx/dy are the
  // displacement from the start; dt is the elapsed time (0 for
  // the fallback, which always fires a tap).
  function processPointerEnd(endX, endY, dt) {
    state.pointerActive = false;
    state.pointerConsumed = true;
    if (state.pointerFallbackTimer) {
      clearTimeout(state.pointerFallbackTimer);
      state.pointerFallbackTimer = null;
    }
    const dx = (endX || 0) - (state.pointerStartX || 0);
    const dy = (endY || 0) - (state.pointerStartY || 0);
    const elapsed = dt || (performance.now() - (state.pointerStartT || 0));

    // Swipe detection: a quick horizontal or vertical drag.
    if (state.pointerDidMove && elapsed < SWIPE_MAX_MS) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_MIN_PX) {
        if (dx < 0) tryLane(state.player.targetLane - 1);
        else tryLane(state.player.targetLane + 1);
        return;
      }
      if (dy < -SWIPE_MIN_PX) {
        tryJump();
        return;
      }
      return;
    }

    // Tap detection: minimal movement, short time, OR a fallback
    // (dt=0 means the fallback fired).
    if (!state.pointerDidMove || Math.abs(dx) < 6 && Math.abs(dy) < 6) {
      const rect = CANVAS.getBoundingClientRect();
      const x = (endX || state.pointerStartX) - rect.left;
      const third = rect.width / 3;
      if (x < third) tryLane(state.player.targetLane - 1);
      else if (x > 2 * third) tryLane(state.player.targetLane + 1);
      else tryJump();
    }
  }

  function onStagePointerUp(e) {
    if (!state.pointerActive) return;
    processPointerEnd(e.clientX, e.clientY, 0);
  }

  // pointercancel and pointerleave are safety nets. If the OS
  // interrupts the gesture (e.g. system gesture, notification),
  // pointerup might not fire. The 250ms fallback will still fire.
  // We also clear the active flag here so a stray cancel doesn't
  // leave the input in a stuck state.
  function onStagePointerCancel() {
    if (!state.pointerActive) return;
    // Don't fire an action here — the fallback timer will handle
    // it if pointerup is truly missing. Just clean up.
    state.pointerActive = false;
    if (state.pointerFallbackTimer) {
      clearTimeout(state.pointerFallbackTimer);
      state.pointerFallbackTimer = null;
    }
  }

  // Action buttons (JUMP / BOOST). Same tap pattern as the overlay
  // buttons above: bind to click + pointerdown with a dedupe
  // guard on the SAME function so neither path runs twice.
  const gameTapHandler = (action) => (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const now = performance.now();
    if (now - (action._lastTap || 0) < 500) return;
    action._lastTap = now;
    action();
  };
  // Same pattern for the leaderboard submit button (kept separate
  // from gameTapHandler so the dedupe is independent).
  const lbTapHandler = (action) => (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const now = performance.now();
    if (now - (action._lastTap || 0) < 500) return;
    action._lastTap = now;
    action();
  };
  JUMP_BTN.addEventListener('click', gameTapHandler(() => tryJump()));
  JUMP_BTN.addEventListener('pointerdown', gameTapHandler(() => tryJump()));
  if (BOOST_BTN) {
    BOOST_BTN.addEventListener('click', gameTapHandler(() => tryBoost()));
    BOOST_BTN.addEventListener('pointerdown', gameTapHandler(() => tryBoost()));
  }

  // -----------------------------------------------------------------------
  // Global leaderboard submit (Coffee Escape)
  // -----------------------------------------------------------------------
  // Tracks whether the current run's score was already submitted
  // to the global leaderboard, so the form doesn't appear twice.
  let scoreSubmitted = false;

  function showLeaderboardForm() {
    if (!LB_FORM) return;
    LB_FORM.hidden = false;
    if (LB_STATUS_EL) {
      LB_STATUS_EL.textContent = '';
      LB_STATUS_EL.classList.remove('is-ok', 'is-error');
    }
    if (LB_NICK_EL) LB_NICK_EL.value = '';
  }

  function hideLeaderboardForm() {
    if (!LB_FORM) return;
    LB_FORM.hidden = true;
  }

  function submitToLeaderboard() {
    if (!PlatformLeaderboard) {
      if (LB_STATUS_EL) {
        LB_STATUS_EL.textContent = 'Leaderboard unavailable.';
        LB_STATUS_EL.classList.add('is-error');
      }
      return;
    }
    if (!LB_NICK_EL) return;
    const nickname = LB_NICK_EL.value.trim();
    if (nickname.length < 1 || nickname.length > 12) {
      if (LB_STATUS_EL) {
        LB_STATUS_EL.textContent = 'Nickname must be 1–12 characters.';
        LB_STATUS_EL.classList.add('is-error');
      }
      return;
    }
    if (LB_SUBMIT_BTN) LB_SUBMIT_BTN.disabled = true;
    if (LB_STATUS_EL) {
      LB_STATUS_EL.textContent = 'Submitting…';
      LB_STATUS_EL.classList.remove('is-ok', 'is-error');
    }
    PlatformLeaderboard.submitScore({
      game: 'coffee-escape',
      nickname: nickname,
      score: state.score,
    }).then(res => {
      if (LB_SUBMIT_BTN) LB_SUBMIT_BTN.disabled = false;
      if (res && res.ok) {
        scoreSubmitted = true;
        if (LB_STATUS_EL) {
          LB_STATUS_EL.textContent = 'Submitted! View it on the leaderboard.';
          LB_STATUS_EL.classList.add('is-ok');
          LB_STATUS_EL.classList.remove('is-error');
        }
        if (LB_SUBMIT_BTN) LB_SUBMIT_BTN.disabled = true;
      } else {
        if (LB_STATUS_EL) {
          LB_STATUS_EL.textContent =
            (res && res.error && res.error.message)
              ? res.error.message
              : 'Submit failed. Please try again.';
          LB_STATUS_EL.classList.add('is-error');
          LB_STATUS_EL.classList.remove('is-ok');
        }
      }
    });
  }

  // -----------------------------------------------------------------------
  // Run lifecycle
  // -----------------------------------------------------------------------
  function showStart() {
    START_OVERLAY.hidden = false;
    GAME_OVER_OVERLAY.hidden = true;
  }

  function resetWorld() {
    state.running = false;
    state.gameOver = false;
    state.score = 0;
    state.worldTime = 0;
    state.speed = BASE_SPEED;
    state.nextSpawn = SPAWN_INTERVAL_START;
    state.lastObZ = -999;
    state.lastObLane = -1;
    state.shake = 0;
    state.flash = 0;
    // Clear any pending pointer fallback timer so a stale tap
    // doesn't fire on the new run.
    if (state.pointerFallbackTimer) {
      clearTimeout(state.pointerFallbackTimer);
      state.pointerFallbackTimer = null;
    }
    state.pointerActive = false;
    state.pointerConsumed = false;
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
    // Hide every pooled obstacle.
    for (const o of state.obstacles) o.mesh.visible = false;
    // Reset boost.
    state.boost.meter = 0;
    state.boost.active = false;
    state.boost.timer = 0;
    // Reset beans, boost particles, dust particles.
    for (const b of state.beans) { b.active = false; b.mesh.visible = false; }
    state.nextBean = 2.5;
    for (const p of state.boostParticles) { p.life = 0; p.mesh.visible = false; }
    for (const d of dustPool) { d.life = 0; d.mesh.visible = false; }
    // Reset camera FOV.
    camera.fov = 70;
    camera.updateProjectionMatrix();
    SCORE_EL.textContent = '0';
  }

  function beginRun() {
    resetWorld();
    // Reset the global leaderboard submit state so a new run can
    // submit its score again. The form is shown on game over.
    scoreSubmitted = false;
    hideLeaderboardForm();
    state.running = true;
    START_OVERLAY.hidden = true;
    GAME_OVER_OVERLAY.hidden = true;
    HUD.hidden = false;
    if (HINT) HINT.hidden = false;
    state.lastTs = performance.now();
    // Show the "RUN!" stamp briefly when the run starts.
    if (RUN_STAMP) {
      RUN_STAMP.classList.remove('is-show');
      // Force a reflow so the animation restarts cleanly.
      void RUN_STAMP.offsetWidth;
      RUN_STAMP.classList.add('is-show');
      setTimeout(() => RUN_STAMP.classList.remove('is-show'), 1100);
    }
    requestAnimationFrame(loop);
  }

  function gameOver() {
    state.running = false;
    state.gameOver = true;
    HUD.hidden = true;
    const newBest = isNewBest(state.score, state.best);
    if (newBest) {
      state.best = state.score;
      saveBest(state.best);
    }
    updateBestDisplays();
    // Reset the highlighted-best styles; the count-up animation
    // re-applies them at the end.
    if (FINAL_SCORE_ITEM) FINAL_SCORE_ITEM.classList.remove('is-best');
    if (FINAL_BEST_ITEM) FINAL_BEST_ITEM.classList.remove('is-best');
    FINAL_SCORE_EL.textContent = '0';
    FINAL_BEST_EL.textContent = '0';
    NEW_BEST_EL.hidden = !newBest;
    OVER_TITLE_EL.textContent = pickGameOverTitle(state.score);
    GAME_OVER_OVERLAY.hidden = false;
    // Show the global-leaderboard submit form (only if the user
    // hasn't already submitted this run). They can submit even if
    // it's not a new personal best — the leaderboard ranks by
    // absolute score.
    if (!scoreSubmitted) {
      showLeaderboardForm();
    } else {
      hideLeaderboardForm();
    }
    // Count-up animation: the displayed score ramps from 0 to the
    // final value over ~700ms with an ease-out.
    const finalScore = state.score;
    const finalBest = state.best;
    const startT = performance.now();
    const dur = 700;
    function tick() {
      const t = Math.min(1, (performance.now() - startT) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      FINAL_SCORE_EL.textContent = String(Math.floor(finalScore * e));
      FINAL_BEST_EL.textContent = String(Math.floor(finalBest * e));
      if (t < 1) requestAnimationFrame(tick);
      else {
        FINAL_SCORE_EL.textContent = String(finalScore);
        FINAL_BEST_EL.textContent = String(finalBest);
        // Highlight the best box if the player set a new record.
        if (newBest) {
          if (FINAL_BEST_ITEM) FINAL_BEST_ITEM.classList.add('is-best');
          if (FINAL_SCORE_EL) {
            FINAL_SCORE_EL.classList.add('is-best');
            FINAL_SCORE_EL.classList.remove('final');
          }
        }
      }
    }
    requestAnimationFrame(tick);
  }

  // pickGameOverTitle imported from ./systems/gameFlow

  function restart() {
    GAME_OVER_OVERLAY.hidden = true;
    beginRun();
  }

  // -----------------------------------------------------------------------
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
    state.worldTime += dt;
    // Difficulty: speed curve. The first 5 seconds are gentle
    // (BASE_SPEED) so the player can learn the controls, then
    // speed ramps up at ~0.6 units/sec until it hits MAX_SPEED
    // around 55s in.
    state.speed = speedAtTime(state.worldTime);
    // Score climbs with time (beans add via collectBean).
    state.score = scoreFromTime(state.worldTime);

    // Lane + jump — pure helpers (tested)
    const p = state.player;
    Object.assign(p, tickLaneMotion(p, dt, LANE_X));
    const jumped = tickJump({
      y: p.y,
      vy: p.vy,
      onGround: p.onGround,
      airT: p.airT || 0,
    }, dt);
    p.y = jumped.y;
    p.vy = jumped.vy;
    p.onGround = jumped.onGround;
    p.airT = jumped.airT;
    p.runAnim = tickRunAnim(p.runAnim, dt, state.speed);

    // -------- Cup position, orientation, and animation --------
    // The cup is built facing the camera (face on local +Z, which is
    // world +Z — the same direction the camera looks at). So:
    //   cup.rotation.x = forward tilt + forward tumble (in air)
    //   cup.rotation.z = bank on lane change
    cup.position.x = p.laneX;
    cup.position.y = p.y;

    // Run-cycle: swing arms and legs in alternation, plus a small
    // vertical bob on the whole cup.
    const swing = Math.sin(p.runAnim) * 1.0;
    const bob = p.onGround ? Math.abs(Math.sin(p.runAnim * 2)) * 0.06 : 0;
    armLGroup.rotation.x = swing;
    armRGroup.rotation.x = -swing;
    legLGroup.rotation.x = -swing * 0.7;
    legRGroup.rotation.x = swing * 0.7;

    // When airborne, tuck the legs and arms slightly (a "happy
    // jump" pose). The cup itself does a forward tumble below.
    if (!p.onGround) {
      const tuck = Math.min(1, p.vy / JUMP_VY + 0.4);
      legLGroup.rotation.x = -1.0 * tuck - 0.3;
      legRGroup.rotation.x = -1.0 * tuck - 0.3;
      armLGroup.rotation.x = -1.5 * tuck - 0.2;
      armRGroup.rotation.x = 1.5 * tuck + 0.2;
    }

    const bank = laneBank(p.laneSwitchT, p.laneFromX, p.laneToX);
    const tiltX = cupTiltX(p.onGround, p.airT || 0);
    cup.rotation.x = tiltX;
    cup.rotation.z = bank;

    // Run bob applied to world Y after all the rotation is set.
    cup.position.y = p.y + bob;

    // Steam: each particle bobs up and slightly sideways.
    for (const child of steamGroup.children) {
      const ph = child.userData.phase || 0;
      const t = state.worldTime * 2 + ph;
      child.position.y = (t * 0.4 % 0.6) + 0.05;
      child.position.x = (ph - 1) * 0.08 + Math.sin(t * 1.5) * 0.02;
      const k = 1 - ((t * 0.4) % 0.6) / 0.6;
      child.scale.setScalar(0.4 + k * 0.9);
    }

    // Man runs in place (he's behind the cup, animated relative to the camera).
    const manSwing = Math.sin(p.runAnim * 0.9) * 0.7;
    manArmL.rotation.x = -manSwing;
    manArmR.rotation.x = manSwing;
    manLegL.rotation.x = manSwing;
    manLegR.rotation.x = -manSwing;
    man.position.y = Math.abs(Math.sin(p.runAnim * 1.8)) * 0.05;

    // Spawn obstacles. The interval ramps down from SPAWN_INTERVAL_START
    // (0.95s) to SPAWN_INTERVAL_MIN (0.45s) over SPAWN_RAMP_SECONDS
    // (25s), then stays at the minimum.
    state.nextSpawn -= dt;
    if (state.nextSpawn <= 0) {
      spawnNext();
      state.nextSpawn = nextSpawnDelay(state.worldTime);
    }

    // Move obstacles toward the cup and recycle.
    for (const o of state.obstacles) {
      if (!o.mesh.visible) continue;
      o.z += state.speed * dt;
      o.mesh.position.z = o.z;
      if (o.z > OBSTACLE_END_Z) {
        o.mesh.visible = false;
      }
    }

    // Collision (Axis-Aligned Bounding Box).
    // The cup's position.y is its base; build the box so it sits on
    // the ground (y=0) and extends up to y≈1.1.
    _playerBox.setFromCenterAndSize(
      new THREE.Vector3(cup.position.x, cup.position.y + 0.55, cup.position.z),
      new THREE.Vector3(0.7, 1.1, 0.7)
    );
    for (const o of state.obstacles) {
      if (!o.mesh.visible) continue;
      if (!blocksPlayerLane(o.lane, p.lane, !!o.wide)) continue;
      _obBox.setFromObject(o.mesh);
      if (_playerBox.intersectsBox(_obBox)) {
        // Boost mode: pass through obstacles. The cup still dodges
        // (gets +1 score and a small flash), but no game over.
        if (state.boost.active) {
          state.score += 1;
          state.flash = 0.15;
          // Briefly push the obstacle off to the side so the
          // player doesn't re-collide with the same one next frame.
          o.lane = -1;
          continue;
        }
        // Crash!
        state.shake = 0.45;
        state.flash = 0.25;
        state.gameOver = true;
        setTimeout(gameOver, 0);
        return;
      }
    }

    // Scroll the floor / walls / ceiling by moving their offset.
    floorTex.offset.y = (state.worldTime * state.speed) / 4;
    wallTex.offset.x = (state.worldTime * state.speed) / 6;
    ceilingTex.offset.y = (state.worldTime * state.speed) / 6;
    // Scroll the wall decorations past the camera and recycle them.
    for (const d of decorItems) {
      d.position.z += state.speed * dt;
      // Recycle: when it has scrolled past the camera, send it back
      // to the front of the visible range.
      if (d.position.z > 8) {
        d.position.z -= decorItems.length * DECOR_SPACING;
      }
    }

    // Camera follows the cup with a slight x lag and a vertical bob
    // (subtle, ~3 cm) for a "running" feel. The bob is faster when
    // boost is active.
    const bobAmp = state.boost.active ? 0.10 : 0.035;
    const bobFreq = state.boost.active ? 14 : 9;
    const camBob = Math.sin(state.worldTime * bobFreq) * bobAmp;
    camera.position.x += (p.laneX * 0.45 - camera.position.x) * Math.min(1, dt * 8);
    camera.position.y = cameraBaseY + p.y * 0.4 + camBob;
    camera.position.z = cameraBaseZ;
    _tmpVec.set(p.laneX * 0.2, 1.0 + p.y * 0.2 + camBob, -8);
    camera.lookAt(_tmpVec);
    // FOV punch on boost (slight zoom-out for a sense of speed)
    const targetFov = state.boost.active ? 78 : 70;
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 4);
    camera.updateProjectionMatrix();

    // Screen shake
    if (state.shake > 0) {
      camera.position.x += (Math.random() - 0.5) * state.shake;
      camera.position.y += (Math.random() - 0.5) * state.shake;
    }

    state.shake = Math.max(0, state.shake - dt * 2.2);
    state.flash = Math.max(0, state.flash - dt * 3);

    // Contact shadow under the cup. Shrinks and fades as the cup
    // rises (when jumping), grows back on landing. Stays at the
    // cup's lane x.
    const shadowScale = Math.max(0.4, 1 - p.y * 0.4);
    contactShadow.scale.set(shadowScale, shadowScale, 1);
    contactShadow.material.opacity = 0.42 * shadowScale;
    contactShadow.position.x = p.laneX;
    contactShadow.position.z = 0;

    // Boost glow around the cup. Pulses opacity in/out, follows the
    // cup position. Hidden when not active.
    boostGlow.position.set(p.laneX, 0.5 + p.y, 0);
    const glowTarget = state.boost.active ? 0.28 + 0.07 * Math.sin(state.worldTime * 8) : 0;
    boostGlow.material.opacity += (glowTarget - boostGlow.material.opacity) * Math.min(1, dt * 6);
    // Also tint the fog slightly blue when boost is active.
    if (state.boost.active) {
      scene.fog.color.lerp(new THREE.Color(0x9ed5ff), Math.min(1, dt * 3));
    } else {
      scene.fog.color.lerp(new THREE.Color(0xffd9a8), Math.min(1, dt * 3));
    }

    // Bean spawn + collision. Beans are more frequent than before
    // (2.2-3.8s) so the hallway always has a collectible between
    // hazards. Obstacle spawns can also drop a bean (see
    // spawnNext) so density stays high.
    state.nextBean -= dt;
    if (state.nextBean <= 0) {
      spawnBean();
      state.nextBean = nextBeanDelay(BEAN_INTERVAL_MIN, BEAN_INTERVAL_MAX);
    }
    for (const b of state.beans) {
      if (!b.active) continue;
      b.z += state.speed * dt;
      b.rot += dt * 1.5;
      b.mesh.position.z = b.z;
      b.mesh.position.x = LANE_X[b.lane];
      b.mesh.position.y = b.y + Math.sin(b.rot * 1.2) * 0.06;
      b.mesh.rotation.y = b.rot;
      // Recycle when past camera
      if (beanRecyclePastCamera(b.z)) {
        b.active = false;
        b.mesh.visible = false;
        continue;
      }
      if (canCollectBean({
        beanLane: b.lane,
        beanZ: b.z,
        playerLane: p.lane,
        playerY: p.y,
      })) {
        collectBean(b);
      }
    }

    // Ambient motes: gentle drift in y, recycle when past camera.
    for (const m of state.motes) {
      m.position.y += Math.sin(state.worldTime * 0.7 + m.userData.phase) * 0.002;
      m.position.z += state.speed * dt * 0.6; // motes drift toward camera slower than the floor
      if (m.position.z > 8) {
        m.position.z = -80 - Math.random() * 10;
        m.position.x = (Math.random() - 0.5) * 6;
      }
    }

    // Boost particles: emit while active, update positions.
    if (state.boost.active) {
      state.nextBoostParticle -= dt;
      if (state.nextBoostParticle <= 0) {
        emitBoostParticle();
        state.nextBoostParticle = 0.04;
      }
    }
    for (const p of state.boostParticles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += state.speed * dt * 0.3;
      p.mesh.material.opacity = Math.max(0, (p.life / p.maxLife) * 0.8);
      p.mesh.scale.setScalar(0.5 + (1 - p.life / p.maxLife) * 0.6);
      if (p.life <= 0) p.mesh.visible = false;
    }

    // Dust particles (bean bursts, future use). Simple Verlet-ish
    // update with gravity, no rotation, no collision.
    for (const d of dustPool) {
      if (d.life <= 0) continue;
      d.life -= dt;
      d.vy -= 5 * dt;            // mild gravity
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.z += d.vz * dt;
      d.mesh.position.set(d.x, d.y, d.z);
      d.mesh.material.opacity = Math.max(0, d.life / d.maxLife);
      d.mesh.scale.setScalar(0.5 + (1 - d.life / d.maxLife) * 0.6);
      if (d.life <= 0) d.mesh.visible = false;
    }

    // Boost meter — pure tick (tested)
    {
      const b = tickBoost({
        active: state.boost.active,
        timer: state.boost.timer,
        meter: state.boost.meter,
        max: state.boost.max,
        cost: state.boost.cost,
        duration: state.boost.duration,
      }, dt);
      state.boost.active = b.active;
      state.boost.timer = b.timer;
      state.boost.meter = b.meter;
    }
    // Update visual fills
    if (BOOST_FILL) BOOST_FILL.style.height = (state.boost.meter / state.boost.max * 100) + '%';
    if (BOOST_HUD_FILL) BOOST_HUD_FILL.style.width = (state.boost.meter / state.boost.max * 100) + '%';
    if (BOOST_BTN) BOOST_BTN.classList.toggle('is-active', state.boost.active);

    SCORE_EL.textContent = String(state.score);
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  function render() {
    renderer.render(scene, camera);
      if (state.flash > 0) {
        // White flash overlay on top of the canvas
        const r = STAGE.getBoundingClientRect();
        const el = document.createElement('div');
        el.style.cssText = `position:absolute;inset:0;background:rgba(255,255,255,${state.flash * 1.2});pointer-events:none;z-index:3;`;
        STAGE.appendChild(el);
        setTimeout(() => el.remove(), 60);
      }
    }

  // -----------------------------------------------------------------------
  // Init
  // -----------------------------------------------------------------------
  function init() {
    loadBest();
    updateBestDisplays();
    document.addEventListener('keydown', onKeyDown);
    // Stage pointer events for gameplay. touch-action: none on
    // the stage + canvas + e.preventDefault() in pointerdown
    // gives us instant, reliable taps on iOS Safari and Android
    // Chrome.
    STAGE.addEventListener('pointerdown', onStagePointerDown);
    STAGE.addEventListener('pointermove', onStagePointerMove);
    STAGE.addEventListener('pointerup', onStagePointerUp);
    STAGE.addEventListener('pointercancel', onStagePointerCancel);
    // iOS Safari gesture events: kill pinch-zoom and rotation
    // during gameplay. Without this, two-finger gestures on iOS
    // can interfere with swipes.
    STAGE.addEventListener('gesturestart', e => e.preventDefault());
    STAGE.addEventListener('gesturechange', e => e.preventDefault());
    // Button handlers. We bind to BOTH 'click' and 'pointerdown'
    // and use a "recently fired" guard on the SAME function so
    // neither path runs the action twice. The pointerdown handler
    // fires the action immediately (no 300ms iOS tap delay) and
    // calls e.preventDefault() to suppress the default browser
    // behavior. The click event might also fire afterwards
    // (depending on the browser); the guard ensures the action
    // only runs once per tap.
    // Keyboard activation (Enter/Space) still works because the
    // document-level keydown handler routes to the right action
    // based on the currently visible overlay.
    const tapHandler = (action) => (e) => {
      if (e && e.preventDefault) e.preventDefault();
      const now = performance.now();
      if (now - (action._lastTap || 0) < 500) return;
      action._lastTap = now;
      action();
    };
    const bindTap = (btn, action) => {
      btn.addEventListener('click', tapHandler(action));
      btn.addEventListener('pointerdown', tapHandler(action));
    };
    bindTap(START_BTN, beginRun);
    bindTap(TRY_AGAIN_BTN, restart);
    RESET_BEST_BTN.addEventListener('click', () => {
      state.best = 0;
      saveBest(0);
      updateBestDisplays();
    });
    // Global leaderboard submit form (in the game-over card).
    if (LB_SUBMIT_BTN) {
      // Same tap pattern as the other buttons: bind to both
      // 'click' and 'pointerdown' with a dedupe guard to kill the
      // iOS 300ms tap delay and avoid double-fires.
      LB_SUBMIT_BTN.addEventListener('click', lbTapHandler(submitToLeaderboard));
      LB_SUBMIT_BTN.addEventListener('pointerdown', lbTapHandler(submitToLeaderboard));
    }
    if (LB_NICK_EL) {
      // Submit when the user presses Enter in the nickname input.
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
