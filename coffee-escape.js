// Coffee Escape ☕🏃
// 2D endless runner where a freshly-poured cup of coffee sprints through a
// house to avoid a tired man who just wants his caffeine. Original game;
// visuals are drawn on canvas (no external assets).

(function () {
  'use strict';

  // ---------- Constants & DOM references ----------
  const STORAGE_KEY = 'codecup-coffee-escape-best';
  const STAGE = document.getElementById('ceStage');
  const CANVAS = document.getElementById('ceCanvas');
  const CTX = CANVAS.getContext('2d');
  const HUD = document.getElementById('ceHud');
  const SCORE_EL = document.getElementById('ceScore');
  const BEST_HUD_EL = document.getElementById('ceBestHud');
  const BEST_START_EL = document.getElementById('ceBestStart');
  const FINAL_SCORE_EL = document.getElementById('ceFinalScore');
  const FINAL_BEST_EL = document.getElementById('ceFinalBest');
  const OVER_TITLE_EL = document.getElementById('ceOverTitle');
  const NEW_BEST_EL = document.getElementById('ceNewBest');
  const START_OVERLAY = document.getElementById('ceStartOverlay');
  const CUTSCENE = document.getElementById('ceCutscene');
  const GAME_OVER_OVERLAY = document.getElementById('ceGameOverOverlay');
  const START_BTN = document.getElementById('ceStartBtn');
  const PLAY_INTRO_BTN = document.getElementById('cePlayIntroBtn');
  const TRY_AGAIN_BTN = document.getElementById('ceTryAgainBtn');
  const CUTSCENE_SKIP_BTN = document.getElementById('ceCutsceneSkip');
  const CUTSCENE_START_BTN = document.getElementById('ceCutsceneStart');
  const RESET_BEST_BTN = document.getElementById('ceResetBest');
  const JUMP_BTN = document.getElementById('ceJumpBtn');
  const HINT = document.getElementById('ceHint');
  const SCENE_DOTS = CUTSCENE.querySelectorAll('.ce-scene-dots .dot');

  // Cutscene configuration
  const SCENE_DURATION_MS = 2400; // time per scene
  const TOTAL_SCENES = 5;

  // Logical world: a virtual 16:9 stage. We scale to fit the actual canvas.
  const WORLD_W = 1600;
  const WORLD_H = 900;
  const GROUND_Y = 760; // y of floor surface in world units

  // Trip tuning (lightweight — keeps the run from feeling unfair)
  const TRIP_BASE_CHANCE = 0.35;   // base probability per successful dodge
  const TRIP_CHAIR_BONUS = 0.25;  // chairs are easier to trip on
  const TRIP_STUN_TIME = 1.0;     // seconds the man is stunned
  const TRIP_BONUS = 5;           // score awarded when the man trips
  const TRIP_SPAWN_DELAY = 0.7;   // extra delay added to the next 2 spawns
  const TRIP_NUDGES = 2;          // number of upcoming spawns to delay

  // Game state
  const state = {
    running: false,
    gameOver: false,
    score: 0,
    best: 0,
    speed: 360,
    baseSpeed: 360,
    maxSpeed: 760,
    worldTime: 0,
    nextSpawn: 0.6,
    spawnInterval: 1.1,
    minSpawn: 0.55,
    pendingTripDelays: 0,           // counts down; pushes nextSpawn out
    obstacles: [],
    dust: [],
    bgOffset: 0,
    player: {
      x: 220,
      y: GROUND_Y,
      vy: 0,
      w: 90,
      h: 100,
      onGround: true,
      jumpCount: 0,
      maxJumps: 2,
      runAnim: 0,
      tilt: 0,
      // Facial expressions
      expression: 'scared',   // normal | scared | shocked | happy
      expressionTimer: 0,     // when > 0, holds expression; counts down
      shockTimer: 0,          // for full-body jolt
      happyTimer: 0,
      // Flash when an obstacle is close
      nearObstacle: false,
    },
    man: {
      x: -260,
      y: GROUND_Y,
      w: 130,
      h: 220,
      proximity: 0,
      targetProximity: 0,
      // Trip / stun state
      stunTimer: 0,
      // Animation offsets
      runAnim: 0,
    },
    shake: 0,
    flash: 0,
    floorOffset: 0,
    lastTs: 0,
  };

  // ---------- Setup / canvas sizing ----------
  function fitCanvas() {
    const rect = STAGE.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    CANVAS.width = Math.floor(rect.width * dpr);
    CANVAS.height = Math.floor(rect.height * dpr);
    CTX.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.viewScale = rect.width / WORLD_W;
    state.viewW = rect.width;
    state.viewH = rect.height;
  }

  // ---------- Best score persistence ----------
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

  // ---------- Floating +N popups (drawn as DOM nodes over the stage) ----
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

  // ---------- Input handling ----------
  function tryJump() {
    if (!state.running || state.gameOver) return;
    const p = state.player;
    if (p.jumpCount < p.maxJumps) {
      p.vy = p.jumpCount === 0 ? -780 : -680;
      p.onGround = false;
      p.jumpCount += 1;
      p.tilt = -0.18;
      HINT && (HINT.hidden = true);
    }
  }

  function onKeyDown(e) {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === ' ') {
      e.preventDefault();
      tryJump();
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

  function onStagePointerDown(e) {
    if (e.target.closest('button, a')) return;
    tryJump();
  }

  // ---------- Cutscene ----------
  let cutsceneTimers = [];
  function clearCutsceneTimers() {
    cutsceneTimers.forEach(t => clearTimeout(t));
    cutsceneTimers = [];
  }

  // Force-hide the cutscene by combining the `hidden` attribute with an
  // explicit `display: none` style. This prevents any stale subtitle
  // from leaking through after Skip / Start Run.
  function hideCutscene() {
    CUTSCENE.hidden = true;
    CUTSCENE.style.display = 'none';
    // Clear all active scene classes so no leftover subtitle shows.
    CUTSCENE.querySelectorAll('.ce-scene').forEach(s => s.classList.remove('active'));
    SCENE_DOTS.forEach(d => d.classList.remove('on'));
  }

  // The cutscene drives a single shared timer schedule so it can be
  // cleanly cancelled. Each scene lasts SCENE_DURATION_MS; on the last
  // scene the Start Run button is revealed, and after a short pause
  // the cutscene auto-advances to the start screen so the user is
  // never left staring at a frozen "RUN!" frame.
  function playCutscene() {
    clearCutsceneTimers();
    // Make sure the cutscene is fully reset and visible.
    CUTSCENE.style.display = '';
    CUTSCENE.hidden = false;
    START_OVERLAY.hidden = true;
    GAME_OVER_OVERLAY.hidden = true;
    CUTSCENE_START_BTN.hidden = true;

    // Reset scene state
    const scenes = CUTSCENE.querySelectorAll('.ce-scene');
    scenes.forEach(s => s.classList.remove('active'));
    scenes[0].classList.add('active');
    SCENE_DOTS.forEach((d, i) => d.classList.toggle('on', i === 0));

    for (let i = 0; i < TOTAL_SCENES; i++) {
      const isLast = i === TOTAL_SCENES - 1;
      cutsceneTimers.push(setTimeout(() => {
        scenes.forEach(s => s.classList.remove('active'));
        scenes[i].classList.add('active');
        SCENE_DOTS.forEach((d, j) => d.classList.toggle('on', j === i));
        if (isLast) {
          // Reveal Start Run on the last scene so the user can act
          CUTSCENE_START_BTN.hidden = false;
        }
      }, i * SCENE_DURATION_MS));
    }
    // After the last scene plays, auto-dismiss the cutscene and go to
    // the start screen. The user can still click Skip or Start Run
    // before this fires to act sooner.
    cutsceneTimers.push(setTimeout(() => {
      hideCutscene();
      showStart();
    }, TOTAL_SCENES * SCENE_DURATION_MS + 600));
  }

  function skipCutscene() {
    clearCutsceneTimers();
    hideCutscene();
    showStart();
  }

  function endCutscene() {
    clearCutsceneTimers();
    hideCutscene();
    beginRun();
  }

  // ---------- Run lifecycle ----------
  function showStart() {
    START_OVERLAY.hidden = false;
    CUTSCENE.hidden = true;
    GAME_OVER_OVERLAY.hidden = true;
  }

  function resetWorld() {
    state.running = false;
    state.gameOver = false;
    state.score = 0;
    state.worldTime = 0;
    state.speed = state.baseSpeed;
    state.spawnInterval = 1.1;
    state.nextSpawn = 0.6;
    state.pendingTripDelays = 0;
    state.obstacles = [];
    state.dust = [];
    state.shake = 0;
    state.flash = 0;
    state.floorOffset = 0;
    const p = state.player;
    p.x = 220;
    p.y = GROUND_Y;
    p.vy = 0;
    p.onGround = true;
    p.jumpCount = 0;
    p.runAnim = 0;
    p.tilt = 0;
    p.expression = 'scared';
    p.expressionTimer = 0;
    p.shockTimer = 0;
    p.happyTimer = 0;
    p.nearObstacle = false;
    const m = state.man;
    m.proximity = 0;
    m.targetProximity = 0;
    m.stunTimer = 0;
    m.runAnim = 0;
    SCORE_EL.textContent = '0';
  }

  function beginRun() {
    resetWorld();
    state.running = true;
    // Hide all overlays so the play area is fully visible.
    START_OVERLAY.hidden = true;
    CUTSCENE.hidden = true;
    CUTSCENE.style.display = 'none';
    CUTSCENE.querySelectorAll('.ce-scene').forEach(s => s.classList.remove('active'));
    GAME_OVER_OVERLAY.hidden = true;
    HUD.hidden = false;
    HINT && (HINT.hidden = false);
    state.lastTs = performance.now();
    requestAnimationFrame(loop);
  }

  function gameOver() {
    state.running = false;
    state.gameOver = true;
    HUD.hidden = true;
    const isNewBest = state.score > state.best;
    if (isNewBest) {
      state.best = state.score;
      saveBest(state.best);
    }
    updateBestDisplays();
    FINAL_SCORE_EL.textContent = String(state.score);
    FINAL_BEST_EL.textContent = String(state.best);
    NEW_BEST_EL.hidden = !isNewBest;
    OVER_TITLE_EL.textContent = pickGameOverTitle(state.score);
    GAME_OVER_OVERLAY.hidden = false;
  }

  function pickGameOverTitle(score) {
    if (score >= 200) return 'Legendary Espresso! ☕👑';
    if (score >= 100) return 'What a brew-tal run! ☕💨';
    if (score >= 50) return 'Caught! ☕😱';
    return 'Spat out! ☕😵';
  }

  function restart() {
    GAME_OVER_OVERLAY.hidden = true;
    playCutscene();
  }

  // ---------- Spawning obstacles ----------
  function spawnObstacle() {
    const types = ['chair', 'table', 'sofa', 'lamp', 'box'];
    const weights = [3, 2, 2, 2, 3];
    let total = 0;
    for (const w of weights) total += w;
    let r = Math.random() * total;
    let kind = types[0];
    for (let i = 0; i < types.length; i++) {
      if (r < weights[i]) { kind = types[i]; break; }
      r -= weights[i];
    }

    if (Math.random() < 0.18 && kind !== 'lamp') {
      const a = makeObstacle(kind);
      const b = makeObstacle(types[Math.floor(Math.random() * types.length)]);
      b.x = a.x + 220 + Math.random() * 80;
      state.obstacles.push(a, b);
    } else {
      state.obstacles.push(makeObstacle(kind));
    }
  }

  function makeObstacle(kind) {
    const base = {
      x: WORLD_W + 80,
      y: GROUND_Y,
      vx: 0,
      kind,
      // Per-obstacle tracking used by the trip system
      dodged: false,         // player has successfully passed it
      clearedAt: 0,          // time when it left the play area after a dodge
      tripResolved: false,   // we've already tried to make the man trip on it
    };
    if (kind === 'chair') return Object.assign(base, { w: 70,  h: 110 });
    if (kind === 'table') return Object.assign(base, { w: 160, h: 90,  y: GROUND_Y - 10 });
    if (kind === 'sofa')  return Object.assign(base, { w: 200, h: 120 });
    if (kind === 'lamp')  return Object.assign(base, { w: 50,  h: 220, y: GROUND_Y - 60 });
    if (kind === 'box')   return Object.assign(base, { w: 90,  h: 80 });
    return Object.assign(base, { w: 80, h: 80 });
  }

  // ---------- Trip system ----------
  // Called when the player has cleared an obstacle. With a small chance
  // the man trips on the trailing edge of the furniture.
  function tryTripMan(ob) {
    if (ob.tripResolved) return;
    ob.tripResolved = true;
    if (state.man.stunTimer > 0) return; // already stunned

    // The man has to be close enough to plausibly hit the obstacle.
    // ob.x is the obstacle's left edge in world units; the man's x is
    // his left edge. The man is far off-screen left during normal play,
    // so we only trip when the obstacle is far past the player (i.e.
    // they've both moved past it) and the man is somewhat close.
    const m = state.man;
    if (m.x > -100) return;

    let chance = TRIP_BASE_CHANCE;
    if (ob.kind === 'chair') chance += TRIP_CHAIR_BONUS;
    if (Math.random() < chance) {
      m.stunTimer = TRIP_STUN_TIME;
      // Stun pushes the man further back — slightly increases
      // his distance from the player (the "you got away" feel)
      m.targetProximity = Math.max(0, m.targetProximity - 0.2);
      // Apply spawn delays so the next couple of obstacles arrive late
      state.pendingTripDelays = TRIP_NUDGES;
      // Reward
      state.score += TRIP_BONUS;
      // Cup is happy briefly
      const p = state.player;
      p.expression = 'happy';
      p.happyTimer = 0.8;
      // Floating +5 at the obstacle
      const sx = (ob.x + ob.w / 2) * state.viewScale;
      const sy = (ob.y - ob.h / 2) * state.viewScale;
      spawnPopup(`+${TRIP_BONUS}`, sx, sy - 12, '#ff8800');
      // Oof! is shown on the canvas inside drawMan()
    }
  }

  // ---------- Main loop ----------
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

  function update(dt) {
    state.worldTime += dt;

    state.speed = Math.min(state.maxSpeed, state.baseSpeed + state.worldTime * 4.2);
    state.score = Math.floor(state.worldTime * 10);

    // Spawning (with optional extra delay if the man just tripped)
    state.nextSpawn -= dt;
    if (state.nextSpawn <= 0) {
      spawnObstacle();
      state.spawnInterval = Math.max(state.minSpawn, 1.1 - state.worldTime * 0.01);
      let next = state.spawnInterval * (0.85 + Math.random() * 0.4);
      if (state.pendingTripDelays > 0) {
        next += TRIP_SPAWN_DELAY;
        state.pendingTripDelays -= 1;
      }
      state.nextSpawn = next;
    }

    // Move obstacles left and track dodges
    for (const o of state.obstacles) {
      const wasPastPlayer = o.x + o.w < state.player.x;
      o.x -= state.speed * dt;
      // Mark dodged when the obstacle has fully passed the player
      if (!o.dodged && wasPastPlayer && o.x + o.w < state.player.x) {
        o.dodged = true;
        o.clearedAt = state.worldTime;
      }
    }
    // Cull off-screen
    for (const o of state.obstacles) {
      if (o.x + o.w < -200) {
        // Just left the play area — give the trip system a chance
        if (o.dodged && !o.tripResolved) tryTripMan(o);
      }
    }
    state.obstacles = state.obstacles.filter(o => o.x + o.w > -200);

    // Player physics
    const p = state.player;
    p.vy += 1850 * dt;
    p.y += p.vy * dt;
    if (p.y >= GROUND_Y) {
      p.y = GROUND_Y;
      p.vy = 0;
      p.onGround = true;
      p.jumpCount = 0;
    }
    p.runAnim += dt * Math.max(8, state.speed / 12);
    p.tilt *= Math.exp(-dt * 6);

    // Expression timers
    if (p.happyTimer > 0) {
      p.happyTimer -= dt;
      if (p.happyTimer <= 0) p.expression = 'scared';
    }
    if (p.shockTimer > 0) {
      p.shockTimer -= dt;
      if (p.shockTimer <= 0) p.expression = p.nearObstacle ? 'scared' : 'normal';
    }
    if (p.expressionTimer > 0) {
      p.expressionTimer -= dt;
      if (p.expressionTimer <= 0) p.expression = 'scared';
    }

    // Shock jolt decay
    p.tilt += (Math.sin(p.runAnim * 0.5) * 0.02) * (p.shockTimer > 0 ? 1 : 0);

    // Man state
    const m = state.man;
    m.runAnim += dt * (m.stunTimer > 0 ? 0 : Math.max(7, state.speed / 18));
    if (m.stunTimer > 0) m.stunTimer -= dt;
    m.proximity += (m.targetProximity - m.proximity) * Math.min(1, dt * 1.4);
    m.targetProximity = Math.max(0, m.targetProximity - dt * 0.05);
    const baseX = -120 - m.proximity * 60;
    m.x = baseX + Math.sin(state.worldTime * 0.6) * 6;

    // Collision detection
    const playerBox = {
      x: p.x + 18,
      y: p.y - p.h + 18,
      w: p.w - 36,
      h: p.h - 30,
    };
    let nearestObstacleDist = Infinity;
    for (const o of state.obstacles) {
      const ob = {
        x: o.x + 6,
        y: o.y - o.h + 6,
        w: o.w - 12,
        h: o.h - 10,
      };
      if (aabb(playerBox, ob)) {
        m.targetProximity = 1;
        state.shake = 0.45;
        state.flash = 0.25;
        spawnDustBurst(p.x + p.w / 2, p.y - p.h / 2, '#caa274');
        p.expression = 'shocked';
        state.gameOver = true;
        setTimeout(gameOver, 0);
        return;
      }
      // Track distance to the rightmost edge of obstacles ahead of the player
      const dx = ob.x - (p.x + p.w);
      if (dx > -20 && dx < nearestObstacleDist) nearestObstacleDist = dx;
    }

    // Expression: "shocked" when an obstacle is close on the right
    const wasNear = p.nearObstacle;
    p.nearObstacle = nearestObstacleDist < 260;
    if (p.nearObstacle) {
      if (!wasNear) {
        p.expression = 'shocked';
        p.shockTimer = 0.6;
      } else if (p.happyTimer <= 0 && p.shockTimer <= 0) {
        p.expression = 'scared';
      }
    } else if (!wasNear && p.happyTimer <= 0 && p.shockTimer <= 0) {
      p.expression = 'scared';
    }

    // Dust trail
    if (p.onGround && state.worldTime % 0.05 < dt) {
      spawnDust(p.x + 10, GROUND_Y - 4, '#d9c6a8');
    }
    for (const d of state.dust) {
      if (d.vx !== undefined) {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.vy += 600 * dt;
        d.vx *= Math.exp(-dt * 1.2);
      } else {
        d.x -= state.speed * dt * 0.6;
      }
      d.life -= dt;
    }
    state.dust = state.dust.filter(d => d.life > 0);

    state.floorOffset = (state.floorOffset + state.speed * dt) % 200;
    state.bgOffset = (state.bgOffset + state.speed * dt * 0.25) % 1000;

    state.shake = Math.max(0, state.shake - dt * 2.2);
    state.flash = Math.max(0, state.flash - dt * 3);

    // HUD
    SCORE_EL.textContent = String(state.score);
  }

  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function spawnDust(x, y, color) {
    state.dust.push({ x, y, color, life: 0.45, r: 6 + Math.random() * 6 });
  }
  function spawnDustBurst(x, y, color) {
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 220;
      state.dust.push({
        x, y, color,
        life: 0.55 + Math.random() * 0.45,
        r: 7 + Math.random() * 9,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
      });
    }
  }

  // ---------- Rendering ----------
  function render() {
    const ctx = CTX;
    const W = state.viewW;
    const H = state.viewH;
    ctx.save();

    if (state.shake > 0) {
      const s = state.shake * 14;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }

    drawHouseBackground(ctx, W, H);
    drawFloor(ctx, W, H);

    const drawables = state.obstacles.slice().sort((a, b) => b.h - a.h);
    for (const o of drawables) drawObstacle(ctx, o);

    drawPlayer(ctx, state.player);
    drawMan(ctx, state.man);
    drawDust(ctx);

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${state.flash * 1.2})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  function scale(v) { return v * state.viewScale; }

  function drawHouseBackground(ctx, W, H) {
    const wallGrad = ctx.createLinearGradient(0, 0, 0, H);
    wallGrad.addColorStop(0, '#fff1d6');
    wallGrad.addColorStop(1, '#ffd9a8');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = '#c97a2b';
    const stripeW = 60;
    const off = (state.bgOffset * 0.4) % (stripeW * 2);
    for (let x = -off; x < W; x += stripeW * 2) {
      ctx.fillRect(x, 0, stripeW, H);
    }
    ctx.restore();

    const moldH = Math.max(8, scale(18));
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, moldH);
    ctx.fillStyle = '#d3a16a';
    ctx.fillRect(0, moldH, W, 2);

    const winX = W * 0.05;
    const winY = H * 0.08;
    const winW = W * 0.22;
    const winH = H * 0.28;
    drawWindow(ctx, winX, winY, winW, winH);

    const picX = W * 0.62;
    const picY = H * 0.10;
    const picW = W * 0.18;
    const picH = H * 0.18;
    drawPicture(ctx, picX, picY, picW, picH);

    const clkX = W * 0.40;
    const clkY = H * 0.18;
    const clkR = Math.min(W, H) * 0.045;
    drawClock(ctx, clkX, clkY, clkR);
  }

  function drawWindow(ctx, x, y, w, h) {
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
    const sky = ctx.createLinearGradient(x, y, x, y + h);
    sky.addColorStop(0, '#aee0ff');
    sky.addColorStop(1, '#fbeac1');
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(x + w / 2 - 3, y, 6, h);
    ctx.fillRect(x, y + h / 2 - 3, w, 6);
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(x + w * 0.78, y + h * 0.3, Math.min(w, h) * 0.10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9bc77a';
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.7, x + w, y + h);
    ctx.closePath();
    ctx.fill();
  }

  function drawPicture(ctx, x, y, w, h) {
    ctx.fillStyle = '#6b3a0a';
    ctx.fillRect(x - 5, y - 5, w + 10, h + 10);
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, '#f4b572');
    g.addColorStop(1, '#c46a1e');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y + h * 0.7);
    ctx.bezierCurveTo(x + w * 0.1, y + h * 0.4, x + w * 0.6, y + h * 0.4, x + w * 0.7, y + h * 0.2);
    ctx.stroke();
  }

  function drawClock(ctx, cx, cy, r) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#6b3a0a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * 0.55, cy + r * 0.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - r * 0.1, cy - r * 0.55);
    ctx.stroke();
    ctx.fillStyle = '#6b3a0a';
    ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();
  }

  function drawFloor(ctx, W, H) {
    const floorTop = H * 0.84;
    const wood = ctx.createLinearGradient(0, floorTop, 0, H);
    wood.addColorStop(0, '#c08650');
    wood.addColorStop(1, '#8a5a2c');
    ctx.fillStyle = wood;
    ctx.fillRect(0, floorTop, W, H - floorTop);
    ctx.save();
    ctx.strokeStyle = 'rgba(60, 30, 10, 0.35)';
    ctx.lineWidth = 1.5;
    const plankH = Math.max(20, scale(36));
    const off = state.floorOffset;
    for (let y = floorTop + off % plankH; y < H; y += plankH) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(60, 30, 10, 0.18)';
    const seamW = Math.max(60, scale(110));
    const offX = state.floorOffset * 1.4;
    for (let x = -offX % seamW; x < W; x += seamW) {
      ctx.beginPath();
      ctx.moveTo(x, floorTop);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#f3d8a8';
    ctx.fillRect(0, floorTop - 6, W, 6);
  }

  function drawObstacle(ctx, o) {
    const s = state.viewScale;
    const x = o.x * s;
    const y = (o.y - o.h) * s;
    const w = o.w * s;
    const h = o.h * s;
    if (o.kind === 'chair') drawChair(ctx, x, y, w, h);
    else if (o.kind === 'table') drawTable(ctx, x, y, w, h);
    else if (o.kind === 'sofa') drawSofa(ctx, x, y, w, h);
    else if (o.kind === 'lamp') drawLamp(ctx, x, y, w, h);
    else if (o.kind === 'box') drawBox(ctx, x, y, w, h);
  }

  function drawChair(ctx, x, y, w, h) {
    ctx.fillStyle = '#a85a2a';
    ctx.fillRect(x, y + h * 0.55, w, h * 0.18);
    ctx.fillStyle = '#7d3f1c';
    ctx.fillRect(x, y, w * 0.12, h * 0.7);
    ctx.fillRect(x + w * 0.88, y, w * 0.12, h * 0.7);
    ctx.fillRect(x, y, w, h * 0.12);
    ctx.fillStyle = '#5a2d12';
    ctx.fillRect(x + 4, y + h * 0.73, 6, h * 0.27);
    ctx.fillRect(x + w - 10, y + h * 0.73, 6, h * 0.27);
    ctx.fillRect(x + 4, y + h * 0.85, w - 8, 4);
  }

  function drawTable(ctx, x, y, w, h) {
    ctx.fillStyle = '#8a4a1f';
    ctx.fillRect(x, y, w, h * 0.18);
    ctx.fillStyle = '#6e3a17';
    ctx.fillRect(x, y + h * 0.16, w, 4);
    ctx.fillStyle = '#5a2d12';
    ctx.fillRect(x + 4, y + h * 0.18, 6, h * 0.82);
    ctx.fillRect(x + w - 10, y + h * 0.18, 6, h * 0.82);
    ctx.fillRect(x + w * 0.5 - 3, y + h * 0.18, 6, h * 0.82);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + w * 0.65, y - 14, 14, 12);
    ctx.fillStyle = '#6b3a14';
    ctx.fillRect(x + w * 0.65 + 2, y - 12, 10, 6);
  }

  function drawSofa(ctx, x, y, w, h) {
    ctx.fillStyle = '#9a5a2a';
    ctx.fillRect(x, y + h * 0.35, w, h * 0.5);
    ctx.fillStyle = '#7d4218';
    ctx.fillRect(x, y, w, h * 0.45);
    ctx.fillStyle = '#6c3712';
    ctx.fillRect(x, y + h * 0.2, w * 0.12, h * 0.65);
    ctx.fillRect(x + w * 0.88, y + h * 0.2, w * 0.12, h * 0.65);
    ctx.fillStyle = '#f3c98a';
    ctx.fillRect(x + w * 0.18, y + h * 0.18, w * 0.2, h * 0.2);
    ctx.fillStyle = '#3a1c08';
    ctx.fillRect(x + 6, y + h * 0.85, 8, h * 0.15);
    ctx.fillRect(x + w - 14, y + h * 0.85, 8, h * 0.15);
  }

  function drawLamp(ctx, x, y, w, h) {
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.moveTo(x - w * 0.1, y);
    ctx.lineTo(x + w * 1.1, y);
    ctx.lineTo(x + w * 0.85, y + h * 0.18);
    ctx.lineTo(x + w * 0.15, y + h * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5a3a14';
    ctx.fillRect(x + w * 0.5 - 2, y + h * 0.18, 4, h * 0.7);
    ctx.fillStyle = '#3a1c08';
    ctx.fillRect(x + w * 0.25, y + h * 0.85, w * 0.5, h * 0.1);
    const g = ctx.createRadialGradient(x + w * 0.5, y + h * 0.05, 4, x + w * 0.5, y + h * 0.05, h * 0.5);
    g.addColorStop(0, 'rgba(255, 230, 160, 0.55)');
    g.addColorStop(1, 'rgba(255, 230, 160, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x + w * 0.5, y + h * 0.05, h * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBox(ctx, x, y, w, h) {
    ctx.fillStyle = '#caa274';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#a07d4d';
    ctx.fillRect(x, y + h * 0.5, w, 4);
    ctx.fillRect(x + w * 0.5, y, 4, h);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + w * 0.18, y + h * 0.18, w * 0.64, h * 0.22);
    ctx.fillStyle = '#5a3a14';
    ctx.font = `${Math.max(10, h * 0.18)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('JAVA', x + w * 0.5, y + h * 0.29);
  }

  // ---------- Player (cup) ----------
  function drawPlayer(ctx, p) {
    const s = state.viewScale;
    const cx = (p.x + p.w / 2) * s;
    const baseY = p.y * s;

    const steamY = baseY - p.h * s;
    drawSteam(ctx, cx, steamY, 1);

    ctx.save();
    ctx.translate(cx, baseY);
    ctx.rotate(p.tilt);
    const cupW = p.w * s;
    const cupH = p.h * s;

    // Saucer shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 0, cupW * 0.55, cupW * 0.10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs (drawn first so they sit behind the cup body)
    drawCupLegs(ctx, p, cupW, cupH);

    // Arms (drawn behind the body too, but extending out the sides)
    drawCupArms(ctx, p, cupW, cupH);

    // Cup body
    ctx.beginPath();
    ctx.moveTo(-cupW * 0.45, 0);
    ctx.lineTo(-cupW * 0.36, -cupH * 0.95);
    ctx.lineTo(cupW * 0.36, -cupH * 0.95);
    ctx.lineTo(cupW * 0.45, 0);
    ctx.closePath();
    const bodyGrad = ctx.createLinearGradient(0, -cupH, 0, 0);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(1, '#e7d3b3');
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = '#5a3a14';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Coffee surface
    ctx.beginPath();
    ctx.ellipse(0, -cupH * 0.95, cupW * 0.36, cupH * 0.06, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#4a2a10';
    ctx.fill();

    // Handle
    ctx.beginPath();
    ctx.lineWidth = Math.max(4, cupW * 0.08);
    ctx.strokeStyle = '#ffffff';
    ctx.arc(cupW * 0.55, -cupH * 0.55, cupH * 0.18, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.strokeStyle = '#5a3a14';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Face
    drawFace(ctx, p, cupW, cupH);

    ctx.restore();
  }

  function drawCupLegs(ctx, p, cupW, cupH) {
    const swing = Math.sin(p.runAnim) * (p.onGround ? 1 : 0.2);
    const liftY = p.onGround ? 0 : -cupH * 0.05;
    ctx.save();
    ctx.strokeStyle = '#5a3a14';
    ctx.lineWidth = Math.max(4, cupW * 0.08);
    ctx.lineCap = 'round';
    // Left leg
    ctx.save();
    ctx.translate(-cupW * 0.18, -cupH * 0.06);
    ctx.rotate(swing * 0.7);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, cupH * 0.14 + liftY);
    ctx.stroke();
    // Shoe
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(0, cupH * 0.14 + liftY, cupW * 0.08, cupH * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Right leg
    ctx.save();
    ctx.translate(cupW * 0.18, -cupH * 0.06);
    ctx.rotate(-swing * 0.7);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, cupH * 0.14 + liftY);
    ctx.stroke();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(0, cupH * 0.14 + liftY, cupW * 0.08, cupH * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  function drawCupArms(ctx, p, cupW, cupH) {
    const swing = Math.sin(p.runAnim) * (p.onGround ? 1 : 0.2);
    ctx.save();
    ctx.strokeStyle = '#5a3a14';
    ctx.lineWidth = Math.max(4, cupW * 0.08);
    ctx.lineCap = 'round';
    // Left arm
    ctx.save();
    ctx.translate(-cupW * 0.42, -cupH * 0.55);
    ctx.rotate(-0.3 + swing * 0.6);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cupW * 0.25, 0);
    ctx.stroke();
    // Hand
    ctx.fillStyle = '#e7b78f';
    ctx.beginPath();
    ctx.arc(cupW * 0.25, 0, cupW * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Right arm
    ctx.save();
    ctx.translate(cupW * 0.42, -cupH * 0.55);
    ctx.rotate(0.3 - swing * 0.6);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-cupW * 0.25, 0);
    ctx.stroke();
    ctx.fillStyle = '#e7b78f';
    ctx.beginPath();
    ctx.arc(-cupW * 0.25, 0, cupW * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  function drawFace(ctx, p, cupW, cupH) {
    const eyeY = -cupH * 0.6;
    const mouthY = -cupH * 0.42;
    const expr = p.expression;
    ctx.save();

    if (expr === 'happy') {
      // Closed smiling eyes (upward arcs)
      ctx.strokeStyle = '#5a3a14';
      ctx.lineWidth = Math.max(2, cupW * 0.04);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-cupW * 0.12, eyeY, cupH * 0.04, Math.PI, 2 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cupW * 0.14, eyeY, cupH * 0.04, Math.PI, 2 * Math.PI);
      ctx.stroke();
      // Big smile
      ctx.beginPath();
      ctx.lineWidth = Math.max(2, cupW * 0.04);
      ctx.arc(0, -cupH * 0.46, cupH * 0.08, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
      // Small tongue
      ctx.fillStyle = '#e57373';
      ctx.beginPath();
      ctx.ellipse(0, -cupH * 0.40, cupW * 0.05, cupH * 0.025, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (expr === 'shocked') {
      // Big round eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-cupW * 0.12, eyeY, cupH * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cupW * 0.14, eyeY, cupH * 0.08, 0, Math.PI * 2); ctx.fill();
      // Tiny pupils
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(-cupW * 0.12, eyeY, cupH * 0.035, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cupW * 0.14, eyeY, cupH * 0.035, 0, Math.PI * 2); ctx.fill();
      // Raised brows
      ctx.strokeStyle = '#5a3a14';
      ctx.lineWidth = Math.max(2, cupW * 0.04);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-cupW * 0.20, eyeY - cupH * 0.10); ctx.lineTo(-cupW * 0.04, eyeY - cupH * 0.13); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cupW * 0.04, eyeY - cupH * 0.13); ctx.lineTo(cupW * 0.22, eyeY - cupH * 0.10); ctx.stroke();
      // Open O mouth
      ctx.fillStyle = '#5a3a14';
      ctx.beginPath();
      ctx.ellipse(0, -cupH * 0.42, cupW * 0.07, cupH * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (expr === 'normal') {
      // Calm eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-cupW * 0.12, eyeY, cupH * 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cupW * 0.14, eyeY, cupH * 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(-cupW * 0.12, eyeY, cupH * 0.025, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cupW * 0.14, eyeY, cupH * 0.025, 0, Math.PI * 2); ctx.fill();
      // Soft smile
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#5a3a14';
      ctx.arc(0, -cupH * 0.46, cupH * 0.05, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    } else {
      // Scared (default during run)
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-cupW * 0.12, eyeY, cupH * 0.07, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cupW * 0.14, eyeY, cupH * 0.07, 0, Math.PI * 2); ctx.fill();
      // Pupils darting
      const offset = Math.sin(p.runAnim * 0.7) * cupW * 0.01;
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(-cupW * 0.12 + offset, eyeY, cupH * 0.035, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cupW * 0.14 + offset, eyeY, cupH * 0.035, 0, Math.PI * 2); ctx.fill();
      // Worried brows (tilted)
      ctx.strokeStyle = '#5a3a14';
      ctx.lineWidth = Math.max(2, cupW * 0.04);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-cupW * 0.20, eyeY - cupH * 0.08); ctx.lineTo(-cupW * 0.04, eyeY - cupH * 0.05); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cupW * 0.04, eyeY - cupH * 0.05); ctx.lineTo(cupW * 0.22, eyeY - cupH * 0.08); ctx.stroke();
      // Open worried mouth (small O)
      ctx.beginPath();
      ctx.arc(0, -cupH * 0.42, cupH * 0.04, 0, 2 * Math.PI);
      ctx.stroke();
      // Sweat drop on the right
      ctx.fillStyle = '#6ec6ff';
      ctx.beginPath();
      ctx.ellipse(cupW * 0.25, eyeY - cupH * 0.06, cupW * 0.025, cupH * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSteam(ctx, cx, topY, intensity) {
    ctx.save();
    ctx.translate(cx, topY);
    const t = performance.now() / 600;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    for (let i = 0; i < 3; i++) {
      const phase = t + i * 0.7;
      const x = Math.sin(phase) * 8;
      const y = -((phase * 14) % 36) - 4;
      const r = 5 + (phase * 2) % 4;
      ctx.globalAlpha = Math.max(0, 0.5 - y / 60) * intensity;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------- Man (chaser) ----------
  function drawMan(ctx, m) {
    const s = state.viewScale;
    const x = m.x * s;
    const y = (m.y - m.h) * s;
    const w = m.w * s;
    const h = m.h * s;
    if (x + w < -50) return;

    const stunned = m.stunTimer > 0;
    ctx.save();
    ctx.translate(x, y);
    if (stunned) ctx.rotate(-0.18);

    // Legs (animated by sin unless stunned)
    const stride = stunned ? 0 : Math.sin(m.runAnim) * 12;
    ctx.fillStyle = '#2b3a55';
    ctx.fillRect(w * 0.20, h * 0.7, w * 0.18, h * 0.3 + stride);
    ctx.fillRect(w * 0.62, h * 0.7, w * 0.18, h * 0.3 - stride);
    // Shoes
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(w * 0.18, h * 0.98, w * 0.22, h * 0.04);
    ctx.fillRect(w * 0.60, h * 0.98, w * 0.22, h * 0.04);
    // Body (sweater)
    ctx.fillStyle = '#a04a2a';
    ctx.fillRect(w * 0.12, h * 0.42, w * 0.76, h * 0.32);
    // Belt
    ctx.fillStyle = '#3a1a0a';
    ctx.fillRect(w * 0.12, h * 0.72, w * 0.76, h * 0.03);

    // Front arm — reaches forward
    ctx.save();
    ctx.translate(w * 0.82, h * 0.46);
    if (stunned) {
      ctx.rotate(-0.9);
    } else {
      ctx.rotate(-0.4 + Math.sin(m.runAnim * 0.6) * 0.15);
    }
    ctx.fillStyle = '#a04a2a';
    ctx.fillRect(0, 0, w * 0.45, h * 0.10);
    ctx.fillStyle = '#e7b78f';
    ctx.beginPath();
    ctx.arc(w * 0.48, h * 0.05, h * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Back arm — swings opposite
    ctx.save();
    ctx.translate(w * 0.10, h * 0.46);
    ctx.rotate(0.4 + Math.sin(m.runAnim * 0.6 + 1) * 0.1);
    ctx.fillStyle = '#a04a2a';
    ctx.fillRect(-w * 0.10, 0, w * 0.10, h * 0.10);
    ctx.restore();

    // Head
    ctx.fillStyle = '#e7b78f';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.30, h * 0.13, 0, Math.PI * 2);
    ctx.fill();
    // Hair
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.21, h * 0.12, h * 0.05, 0, Math.PI, 2 * Math.PI);
    ctx.fill();

    // Eyes — half-closed (tired) unless stunned (X eyes)
    if (stunned) {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.40 - 3, h * 0.30 - 3);
      ctx.lineTo(w * 0.40 + 7, h * 0.30 + 3);
      ctx.moveTo(w * 0.40 + 7, h * 0.30 - 3);
      ctx.lineTo(w * 0.40 - 3, h * 0.30 + 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.55 - 3, h * 0.30 - 3);
      ctx.lineTo(w * 0.55 + 7, h * 0.30 + 3);
      ctx.moveTo(w * 0.55 + 7, h * 0.30 - 3);
      ctx.lineTo(w * 0.55 - 3, h * 0.30 + 3);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#222';
      ctx.fillRect(w * 0.40, h * 0.30, w * 0.07, h * 0.012);
      ctx.fillRect(w * 0.55, h * 0.30, w * 0.07, h * 0.012);
    }
    // Frown
    ctx.strokeStyle = '#5a3a14';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.36, w * 0.05, 1.2 * Math.PI, 1.8 * Math.PI);
    ctx.stroke();
    // Stubble
    ctx.fillStyle = 'rgba(80, 50, 30, 0.35)';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.39, w * 0.10, h * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mug in the front hand
    ctx.save();
    ctx.translate(w * 0.82 + w * 0.45, h * 0.50);
    ctx.rotate(stunned ? -0.6 : -0.2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-h * 0.05, -h * 0.04, h * 0.10, h * 0.08);
    ctx.fillStyle = '#5a3a14';
    ctx.fillRect(-h * 0.045, -h * 0.035, h * 0.09, h * 0.025);
    ctx.restore();

    ctx.restore();

    // "Oof!" speech bubble when stunned
    if (stunned) {
      const bx = x + w * 0.4;
      const by = y - 12;
      drawSpeechBubble(ctx, bx, by, 'Oof!');
    }
  }

  function drawSpeechBubble(ctx, x, y, text) {
    ctx.save();
    ctx.font = '700 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const paddingX = 10;
    const paddingY = 6;
    const textWidth = ctx.measureText(text).width;
    const w = textWidth + paddingX * 2;
    const h = 28;
    // Bubble body
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#3a1a0a';
    ctx.lineWidth = 2;
    roundRect(ctx, x - w / 2, y - h / 2, w, h, 10);
    ctx.fill();
    ctx.stroke();
    // Tail
    ctx.beginPath();
    ctx.moveTo(x - 6, y + h / 2);
    ctx.lineTo(x, y + h / 2 + 12);
    ctx.lineTo(x + 6, y + h / 2);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.stroke();
    // Text
    ctx.fillStyle = '#c0392b';
    ctx.fillText(text, x, y + 1);
    // A couple of "stars" around the head
    ctx.fillStyle = '#ffeb3b';
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + performance.now() / 600;
      const sx = x + Math.cos(a) * 24;
      const sy = y - 18 + Math.sin(a) * 8;
      drawStar(ctx, sx, sy, 4);
    }
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawStar(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const x2 = x + Math.cos(a) * r;
      const y2 = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
      const a2 = a + Math.PI / 5;
      ctx.lineTo(x + Math.cos(a2) * r * 0.5, y + Math.sin(a2) * r * 0.5);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawDust(ctx) {
    for (const d of state.dust) {
      ctx.fillStyle = d.color;
      ctx.globalAlpha = Math.max(0, d.life);
      ctx.beginPath();
      ctx.arc(d.x * state.viewScale, d.y * state.viewScale, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Event wiring ----------
  function bind() {
    fitCanvas();
    window.addEventListener('resize', () => {
      fitCanvas();
      if (state.running) render();
    });

    document.addEventListener('keydown', onKeyDown);
    STAGE.addEventListener('pointerdown', onStagePointerDown);
    JUMP_BTN.addEventListener('click', (e) => { e.preventDefault(); tryJump(); });

    START_BTN.addEventListener('click', beginRun);
    PLAY_INTRO_BTN.addEventListener('click', playCutscene);
    TRY_AGAIN_BTN.addEventListener('click', restart);
    CUTSCENE_SKIP_BTN.addEventListener('click', skipCutscene);
    CUTSCENE_START_BTN.addEventListener('click', endCutscene);

    RESET_BEST_BTN.addEventListener('click', () => {
      state.best = 0;
      saveBest(0);
      updateBestDisplays();
    });
  }

  // ---------- Init ----------
  function init() {
    loadBest();
    updateBestDisplays();
    bind();
    state.viewScale = STAGE.getBoundingClientRect().width / WORLD_W;
    state.viewW = STAGE.getBoundingClientRect().width;
    state.viewH = STAGE.getBoundingClientRect().height;
    // Show the start screen on first paint (no auto-cutscene)
    showStart();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
