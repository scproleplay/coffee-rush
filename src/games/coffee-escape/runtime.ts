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
import { attachInputController } from './systems/inputController';
import {
  initObstaclePool as initObstaclePoolFactory,
  rebuildObstacle as rebuildObstacleFactory,
  firstHiddenObstacle,
} from './entities/obstaclePool';

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

    // Obstacle pool (entity factory)
  initObstaclePoolFactory(scene, state.obstacles);

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
    const ob = firstHiddenObstacle(state.obstacles);
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
      const ob = firstHiddenObstacle(state.obstacles);
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
    rebuildObstacleFactory(ob, kind);
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
    inputCtl.clearPointer();
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
    // assigned below for input controller
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
    if (GAME_OVER_OVERLAY) GAME_OVER_OVERLAY.hidden = true;
    beginRun();
  }
  beginRunRef = beginRun;
  restartRef = restart;

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
