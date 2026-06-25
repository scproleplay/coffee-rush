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
  const STORY_OVERLAY = document.getElementById('ceStoryOverlay');
  const GAME_OVER_OVERLAY = document.getElementById('ceGameOverOverlay');
  const START_BTN = document.getElementById('ceStartBtn');
  const TRY_AGAIN_BTN = document.getElementById('ceTryAgainBtn');
  const STORY_SKIP_BTN = document.getElementById('ceStorySkip');
  const RESET_BEST_BTN = document.getElementById('ceResetBest');
  const JUMP_BTN = document.getElementById('ceJumpBtn');
  const HINT = document.getElementById('ceHint');

  const STORY_LINES = [
    document.getElementById('ceStory1'),
    document.getElementById('ceStory2'),
    document.getElementById('ceStory3'),
    document.getElementById('ceStory4'),
  ];

  // Logical world: a virtual 16:9 stage. We scale to fit the actual canvas.
  const WORLD_W = 1600;
  const WORLD_H = 900;
  const GROUND_Y = 760; // y of floor surface in world units

  // Game state
  const state = {
    running: false,
    gameOver: false,
    score: 0,
    best: 0,
    speed: 360,           // world units per second; increases with time
    baseSpeed: 360,
    maxSpeed: 760,
    worldTime: 0,         // accumulated run time (seconds)
    nextSpawn: 0.6,       // seconds until next obstacle
    spawnInterval: 1.1,   // current spawn interval
    minSpawn: 0.55,
    obstacles: [],
    dust: [],
    bgOffset: 0,          // for parallax floor / wallpaper
    player: {
      x: 220,
      y: GROUND_Y,
      vy: 0,
      w: 90,
      h: 100,
      onGround: true,
      jumpCount: 0,
      maxJumps: 2,        // double jump
      runAnim: 0,
      tilt: 0,
    },
    man: {
      x: -260,            // starts off-screen left
      y: GROUND_Y,
      w: 130,
      h: 220,
      // Each time the player hits an obstacle, the man gets closer.
      proximity: 0,       // 0 = far, 1 = catches up
      targetProximity: 0,
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
    // world->screen scale based on width
    state.viewScale = rect.width / WORLD_W;
    state.viewW = rect.width;
    state.viewH = rect.height;
  }

  function worldToScreen(x, y) {
    const s = state.viewScale;
    return { x: x * s, y: y * s };
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

  // ---------- Input handling ----------
  // We support keyboard (space/arrow up), the on-screen JUMP button, and
  // pointer/touch anywhere on the stage (excluding buttons) for phones.
  function tryJump() {
    if (!state.running || state.gameOver) return;
    const p = state.player;
    if (p.jumpCount < p.maxJumps) {
      p.vy = p.jumpCount === 0 ? -780 : -680; // second jump is a bit shorter
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
      // Convenience: Enter on start/game-over screens
      if (!state.running && !state.gameOver) {
        e.preventDefault();
        startFromStart();
      } else if (state.gameOver) {
        e.preventDefault();
        restart();
      }
    }
  }

  // Tap anywhere on the stage to jump (mobile-friendly). Don't fire when
  // tapping real buttons.
  function onStagePointerDown(e) {
    if (e.target.closest('button, a')) return;
    tryJump();
  }

  // ---------- Story intro sequence ----------
  let storyTimers = [];
  function clearStoryTimers() {
    storyTimers.forEach(t => clearTimeout(t));
    storyTimers = [];
  }
  function playStoryThenStart() {
    clearStoryTimers();
    STORY_OVERLAY.hidden = false;
    GAME_OVER_OVERLAY.hidden = true;
    START_OVERLAY.hidden = true;

    // Reset line states
    STORY_LINES.forEach((el, i) => {
      el.classList.remove('show', 'run');
    });

    // Reveal each line with a short delay
    const delays = [200, 900, 1600, 2400];
    delays.forEach((d, i) => {
      storyTimers.push(setTimeout(() => {
        if (STORY_LINES[i]) {
          STORY_LINES[i].classList.add('show');
          if (i === 3) STORY_LINES[i].classList.add('run');
        }
      }, d));
    });
    // After the last line, start the game
    storyTimers.push(setTimeout(() => {
      STORY_OVERLAY.hidden = true;
      beginRun();
    }, delays[3] + 700));
  }

  function skipStory() {
    clearStoryTimers();
    STORY_OVERLAY.hidden = true;
    beginRun();
  }

  // ---------- Run lifecycle ----------
  function resetWorld() {
    state.running = false;
    state.gameOver = false;
    state.score = 0;
    state.worldTime = 0;
    state.speed = state.baseSpeed;
    state.spawnInterval = 1.1;
    state.nextSpawn = 0.6;
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
    const m = state.man;
    m.proximity = 0;
    m.targetProximity = 0;
    SCORE_EL.textContent = '0';
  }

  function beginRun() {
    resetWorld();
    state.running = true;
    HUD.hidden = false;
    HINT && (HINT.hidden = false);
    state.lastTs = performance.now();
    requestAnimationFrame(loop);
  }

  function startFromStart() {
    playStoryThenStart();
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
    playStoryThenStart();
  }

  // ---------- Spawning obstacles ----------
  // Each obstacle has a type and a footprint rectangle used for collision.
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

    // Group some obstacles together occasionally for variety
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
    const base = { x: WORLD_W + 80, y: GROUND_Y, vx: 0, kind };
    if (kind === 'chair') {
      return Object.assign(base, { w: 70, h: 110 });
    }
    if (kind === 'table') {
      return Object.assign(base, { w: 160, h: 90, y: GROUND_Y - 10 });
    }
    if (kind === 'sofa') {
      return Object.assign(base, { w: 200, h: 120, y: GROUND_Y });
    }
    if (kind === 'lamp') {
      return Object.assign(base, { w: 50, h: 220, y: GROUND_Y - 60 });
    }
    if (kind === 'box') {
      return Object.assign(base, { w: 90, h: 80, y: GROUND_Y });
    }
    return Object.assign(base, { w: 80, h: 80 });
  }

  // ---------- Main loop ----------
  function loop(ts) {
    if (!state.running && !state.gameOver) return;
    if (!state.running) return; // freeze on game over
    const dtRaw = (ts - state.lastTs) / 1000;
    const dt = Math.min(dtRaw, 1 / 30); // clamp to keep physics stable
    state.lastTs = ts;

    update(dt);
    render();

    requestAnimationFrame(loop);
  }

  function update(dt) {
    state.worldTime += dt;

    // Difficulty: speed slowly rises
    state.speed = Math.min(state.maxSpeed, state.baseSpeed + state.worldTime * 4.2);

    // Score climbs over time (and a little extra per obstacle cleared)
    state.score = Math.floor(state.worldTime * 10);

    // Spawning
    state.nextSpawn -= dt;
    if (state.nextSpawn <= 0) {
      spawnObstacle();
      // Spawn interval shrinks as speed increases
      state.spawnInterval = Math.max(state.minSpawn, 1.1 - state.worldTime * 0.01);
      state.nextSpawn = state.spawnInterval * (0.85 + Math.random() * 0.4);
    }

    // Move obstacles left
    for (const o of state.obstacles) {
      o.x -= state.speed * dt;
    }
    // Cull off-screen
    state.obstacles = state.obstacles.filter(o => o.x + o.w > -200);

    // Player physics
    const p = state.player;
    p.vy += 1850 * dt; // gravity
    p.y += p.vy * dt;
    if (p.y >= GROUND_Y) {
      p.y = GROUND_Y;
      p.vy = 0;
      p.onGround = true;
      p.jumpCount = 0;
    }
    p.runAnim += dt * Math.max(8, state.speed / 12);
    p.tilt *= Math.exp(-dt * 6);

    // The tired man: he slowly chases the player. He gets a noticeable
    // jolt closer each time the player fails a jump and the cup gets
    // caught — we set proximity=1 on collision then ease back to 0
    // over time as the cup escapes again.
    const m = state.man;
    m.proximity += (m.targetProximity - m.proximity) * Math.min(1, dt * 1.4);
    m.targetProximity = Math.max(0, m.targetProximity - dt * 0.05);
    // Slight forward drift of the man based on proximity
    const baseX = -120 - m.proximity * 60;
    m.x = baseX + Math.sin(state.worldTime * 0.6) * 6;

    // Collision detection (AABB). Player has a slightly smaller hitbox
    // than the visual cup so jumps feel fair.
    const playerBox = {
      x: p.x + 18,
      y: p.y - p.h + 18,
      w: p.w - 36,
      h: p.h - 30,
    };
    for (const o of state.obstacles) {
      const ob = {
        x: o.x + 6,
        y: o.y - o.h + 6,
        w: o.w - 12,
        h: o.h - 10,
      };
      if (aabb(playerBox, ob)) {
        // Crash!
        m.targetProximity = 1;
        state.shake = 0.45;
        state.flash = 0.25;
        spawnDustBurst(p.x + p.w / 2, p.y - p.h / 2, '#caa274');
        state.gameOver = true;
        // Defer to next tick so the screen renders the impact once
        setTimeout(gameOver, 0);
        return;
      }
    }

    // Dust trail under the cup
    if (p.onGround && state.worldTime % 0.05 < dt) {
      spawnDust(p.x + 10, GROUND_Y - 4, '#d9c6a8');
    }
    // Update dust. Trail particles drift left with the floor; burst
    // particles (those with vx) follow their own velocity and gravity.
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

    // Background parallax offsets
    state.floorOffset = (state.floorOffset + state.speed * dt) % 200;
    state.bgOffset = (state.bgOffset + state.speed * dt * 0.25) % 1000;

    // Shake/flash decay
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
    // Tag particles with an initial velocity; the per-frame update in
    // update() will move them and decay `life`. We push N particles at
    // once and let the existing dust integrator handle motion.
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 220;
      state.dust.push({
        x, y,
        color,
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

    // Screen shake
    if (state.shake > 0) {
      const s = state.shake * 14;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }

    drawHouseBackground(ctx, W, H);
    drawFloor(ctx, W, H);

    // Sort obstacles by depth (taller items draw first so the player is
    // visible while passing in front of low items)
    const drawables = state.obstacles.slice().sort((a, b) => b.h - a.h);
    for (const o of drawables) drawObstacle(ctx, o);

    drawPlayer(ctx, state.player);
    drawMan(ctx, state.man);
    drawDust(ctx);

    // Flash on collision
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${state.flash * 1.2})`;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.restore();
  }

  function scale(v) { return v * state.viewScale; }

  function drawHouseBackground(ctx, W, H) {
    // Sky/wall: warm cream wash
    const wallGrad = ctx.createLinearGradient(0, 0, 0, H);
    wallGrad.addColorStop(0, '#fff1d6');
    wallGrad.addColorStop(1, '#ffd9a8');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, H);

    // Wallpaper stripes (subtle)
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = '#c97a2b';
    const stripeW = 60;
    const off = (state.bgOffset * 0.4) % (stripeW * 2);
    for (let x = -off; x < W; x += stripeW * 2) {
      ctx.fillRect(x, 0, stripeW, H);
    }
    ctx.restore();

    // Crown molding
    const moldH = Math.max(8, scale(18));
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, moldH);
    ctx.fillStyle = '#d3a16a';
    ctx.fillRect(0, moldH, W, 2);

    // Window on the left wall
    const winX = W * 0.05;
    const winY = H * 0.08;
    const winW = W * 0.22;
    const winH = H * 0.28;
    drawWindow(ctx, winX, winY, winW, winH);

    // Framed picture
    const picX = W * 0.62;
    const picY = H * 0.10;
    const picW = W * 0.18;
    const picH = H * 0.18;
    drawPicture(ctx, picX, picY, picW, picH);

    // Wall clock
    const clkX = W * 0.40;
    const clkY = H * 0.18;
    const clkR = Math.min(W, H) * 0.045;
    drawClock(ctx, clkX, clkY, clkR);
  }

  function drawWindow(ctx, x, y, w, h) {
    // Frame
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
    // Glass / sky
    const sky = ctx.createLinearGradient(x, y, x, y + h);
    sky.addColorStop(0, '#aee0ff');
    sky.addColorStop(1, '#fbeac1');
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h);
    // Cross bars
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(x + w / 2 - 3, y, 6, h);
    ctx.fillRect(x, y + h / 2 - 3, w, 6);
    // Sun
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(x + w * 0.78, y + h * 0.3, Math.min(w, h) * 0.10, 0, Math.PI * 2);
    ctx.fill();
    // Distant hill
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
    // Steam swirl
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
    // Hour hand pointing to "tired" o'clock
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
    // Wood floor
    const wood = ctx.createLinearGradient(0, floorTop, 0, H);
    wood.addColorStop(0, '#c08650');
    wood.addColorStop(1, '#8a5a2c');
    ctx.fillStyle = wood;
    ctx.fillRect(0, floorTop, W, H - floorTop);
    // Floor planks (parallax with state.floorOffset)
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
    // Vertical seams
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
    // Baseboard
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
    // Seat
    ctx.fillStyle = '#a85a2a';
    ctx.fillRect(x, y + h * 0.55, w, h * 0.18);
    // Back
    ctx.fillStyle = '#7d3f1c';
    ctx.fillRect(x, y, w * 0.12, h * 0.7);
    ctx.fillRect(x + w * 0.88, y, w * 0.12, h * 0.7);
    ctx.fillRect(x, y, w, h * 0.12);
    // Legs
    ctx.fillStyle = '#5a2d12';
    ctx.fillRect(x + 4, y + h * 0.73, 6, h * 0.27);
    ctx.fillRect(x + w - 10, y + h * 0.73, 6, h * 0.27);
    ctx.fillRect(x + 4, y + h * 0.85, w - 8, 4);
  }

  function drawTable(ctx, x, y, w, h) {
    // Top
    ctx.fillStyle = '#8a4a1f';
    ctx.fillRect(x, y, w, h * 0.18);
    ctx.fillStyle = '#6e3a17';
    ctx.fillRect(x, y + h * 0.16, w, 4);
    // Legs
    ctx.fillStyle = '#5a2d12';
    ctx.fillRect(x + 4, y + h * 0.18, 6, h * 0.82);
    ctx.fillRect(x + w - 10, y + h * 0.18, 6, h * 0.82);
    ctx.fillRect(x + w * 0.5 - 3, y + h * 0.18, 6, h * 0.82);
    // Cup on table for charm
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + w * 0.65, y - 14, 14, 12);
    ctx.fillStyle = '#6b3a14';
    ctx.fillRect(x + w * 0.65 + 2, y - 12, 10, 6);
  }

  function drawSofa(ctx, x, y, w, h) {
    // Base
    ctx.fillStyle = '#9a5a2a';
    ctx.fillRect(x, y + h * 0.35, w, h * 0.5);
    // Back cushion
    ctx.fillStyle = '#7d4218';
    ctx.fillRect(x, y, w, h * 0.45);
    // Arm rests
    ctx.fillStyle = '#6c3712';
    ctx.fillRect(x, y + h * 0.2, w * 0.12, h * 0.65);
    ctx.fillRect(x + w * 0.88, y + h * 0.2, w * 0.12, h * 0.65);
    // Pillow
    ctx.fillStyle = '#f3c98a';
    ctx.fillRect(x + w * 0.18, y + h * 0.18, w * 0.2, h * 0.2);
    // Legs
    ctx.fillStyle = '#3a1c08';
    ctx.fillRect(x + 6, y + h * 0.85, 8, h * 0.15);
    ctx.fillRect(x + w - 14, y + h * 0.85, 8, h * 0.15);
  }

  function drawLamp(ctx, x, y, w, h) {
    // Shade
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.moveTo(x - w * 0.1, y);
    ctx.lineTo(x + w * 1.1, y);
    ctx.lineTo(x + w * 0.85, y + h * 0.18);
    ctx.lineTo(x + w * 0.15, y + h * 0.18);
    ctx.closePath();
    ctx.fill();
    // Pole
    ctx.fillStyle = '#5a3a14';
    ctx.fillRect(x + w * 0.5 - 2, y + h * 0.18, 4, h * 0.7);
    // Base
    ctx.fillStyle = '#3a1c08';
    ctx.fillRect(x + w * 0.25, y + h * 0.85, w * 0.5, h * 0.1);
    // Light glow
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
    // Label
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + w * 0.18, y + h * 0.18, w * 0.64, h * 0.22);
    ctx.fillStyle = '#5a3a14';
    ctx.font = `${Math.max(10, h * 0.18)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('JAVA', x + w * 0.5, y + h * 0.29);
  }

  function drawPlayer(ctx, p) {
    const s = state.viewScale;
    const cx = (p.x + p.w / 2) * s;
    const baseY = p.y * s; // feet

    // Steam above the cup when running
    const steamY = baseY - p.h * s;
    drawSteam(ctx, cx, steamY, 1);

    ctx.save();
    ctx.translate(cx, baseY);
    ctx.rotate(p.tilt);
    // The cup body
    const cupW = p.w * s;
    const cupH = p.h * s;

    // Saucer shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 0, cupW * 0.55, cupW * 0.10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cup body (trapezoid)
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

    // Eyes — wide with panic
    const eyeY = -cupH * 0.6;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-cupW * 0.12, eyeY, cupH * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cupW * 0.14, eyeY, cupH * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    const blinkOffset = Math.sin(p.runAnim) * 1.5;
    ctx.beginPath(); ctx.arc(-cupW * 0.12, eyeY + blinkOffset, cupH * 0.025, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cupW * 0.14, eyeY + blinkOffset, cupH * 0.025, 0, Math.PI * 2); ctx.fill();

    // Worried mouth
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#5a3a14';
    ctx.arc(0, -cupH * 0.42, cupH * 0.06, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    // Little legs running
    const legSwing = Math.sin(p.runAnim) * 0.4;
    ctx.strokeStyle = '#5a3a14';
    ctx.lineWidth = Math.max(3, cupW * 0.06);
    ctx.beginPath();
    ctx.moveTo(-cupW * 0.15, -cupH * 0.05);
    ctx.lineTo(-cupW * 0.15 - legSwing * 12, -2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cupW * 0.15, -cupH * 0.05);
    ctx.lineTo(cupW * 0.15 + legSwing * 12, -2);
    ctx.stroke();

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

  function drawMan(ctx, m) {
    const s = state.viewScale;
    const x = m.x * s;
    const y = (m.y - m.h) * s;
    const w = m.w * s;
    const h = m.h * s;

    // Only draw if on-screen or close
    if (x + w < -50) return;

    ctx.save();
    // Shuffle in: position by m.x
    ctx.translate(x, y);
    // Legs
    const stride = Math.sin(performance.now() / 130) * 8;
    ctx.fillStyle = '#2b3a55';
    ctx.fillRect(w * 0.20, h * 0.7, w * 0.18, h * 0.3 + stride);
    ctx.fillRect(w * 0.62, h * 0.7, w * 0.18, h * 0.3 - stride);
    // Shoes
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(w * 0.18, h * 0.98, w * 0.22, h * 0.04);
    ctx.fillRect(w * 0.60, h * 0.98, w * 0.22, h * 0.04);
    // Body (tired sweater)
    ctx.fillStyle = '#a04a2a';
    ctx.fillRect(w * 0.12, h * 0.42, w * 0.76, h * 0.32);
    // Belt
    ctx.fillStyle = '#3a1a0a';
    ctx.fillRect(w * 0.12, h * 0.72, w * 0.76, h * 0.03);
    // Arms — one reaching forward
    ctx.fillStyle = '#a04a2a';
    ctx.save();
    ctx.translate(w * 0.82, h * 0.46);
    ctx.rotate(-0.4 + Math.sin(performance.now() / 200) * 0.1);
    ctx.fillRect(0, 0, w * 0.45, h * 0.10);
    // Hand
    ctx.fillStyle = '#e7b78f';
    ctx.beginPath();
    ctx.arc(w * 0.48, h * 0.05, h * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Other arm swinging
    ctx.save();
    ctx.translate(w * 0.10, h * 0.46);
    ctx.rotate(0.4 + Math.sin(performance.now() / 200 + 1) * 0.1);
    ctx.fillRect(-w * 0.10, 0, w * 0.10, h * 0.10);
    ctx.restore();
    // Head
    ctx.fillStyle = '#e7b78f';
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.30, h * 0.13, 0, Math.PI * 2);
    ctx.fill();
    // Hair (balding-ish)
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.21, h * 0.12, h * 0.05, 0, Math.PI, 2 * Math.PI);
    ctx.fill();
    // Tired eyes (half-closed)
    ctx.fillStyle = '#222';
    ctx.fillRect(w * 0.40, h * 0.30, w * 0.07, h * 0.012);
    ctx.fillRect(w * 0.55, h * 0.30, w * 0.07, h * 0.012);
    // Frown / sleepy mouth
    ctx.strokeStyle = '#5a3a14';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.36, w * 0.05, 1.2 * Math.PI, 1.8 * Math.PI);
    ctx.stroke();
    // 5 o'clock shadow
    ctx.fillStyle = 'rgba(80, 50, 30, 0.35)';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.39, w * 0.10, h * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
    // Coffee mug in front hand — drooping slightly
    ctx.save();
    ctx.translate(w * 0.82 + w * 0.45, h * 0.50);
    ctx.rotate(-0.2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-h * 0.05, -h * 0.04, h * 0.10, h * 0.08);
    ctx.fillStyle = '#5a3a14';
    ctx.fillRect(-h * 0.045, -h * 0.035, h * 0.09, h * 0.025);
    ctx.restore();
    ctx.restore();
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
      // Re-render one frame so the new size shows immediately
      if (state.running) render();
    });

    document.addEventListener('keydown', onKeyDown);
    STAGE.addEventListener('pointerdown', onStagePointerDown);
    JUMP_BTN.addEventListener('click', (e) => { e.preventDefault(); tryJump(); });

    START_BTN.addEventListener('click', startFromStart);
    TRY_AGAIN_BTN.addEventListener('click', restart);
    STORY_SKIP_BTN.addEventListener('click', skipStory);

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
    // Initial paint so the start screen sits over a pretty background
    state.viewScale = STAGE.getBoundingClientRect().width / WORLD_W;
    state.viewW = STAGE.getBoundingClientRect().width;
    state.viewH = STAGE.getBoundingClientRect().height;
    render();
  }

  // Wait for layout so the canvas has a real size on first paint
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
