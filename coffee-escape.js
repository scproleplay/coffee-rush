// Coffee Escape v2.0 — 3D endless runner
// Third-person camera behind and slightly above a coffee cup that sprints
// down an office hallway. Three lanes (left / center / right). Avoid
// furniture. Score climbs with time, speed slowly increases. Best score
// saved in localStorage. Cutscene, start, and game-over screens stay as
// DOM overlays; the canvas is just the play area.
//
// All visuals are built from Three.js primitives + a few small canvas
// textures generated at startup. No external 3D assets, no copyrighted
// material. The cup, the man, the furniture, and the hallway are
// placeholder shapes for v2.0; the next pass will polish the art.

(function () {
  'use strict';

  // -----------------------------------------------------------------------
  // DOM references
  // -----------------------------------------------------------------------
  const STORAGE_KEY = 'codecup-coffee-escape-best';
  const STAGE = document.getElementById('ceStage');
  const CANVAS = document.getElementById('ceCanvas');
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

  // Cutscene
  const SCENE_DURATION_MS = 2400;
  const TOTAL_SCENES = 5;

  // -----------------------------------------------------------------------
  // World constants
  // -----------------------------------------------------------------------
  // Three lanes indexed 0/1/2 (left/center/right). The cup's lane is
  // laneX[currentLane] and it interpolates to laneX[targetLane].
  const LANE_X = [-1.6, 0, 1.6];
  const LANE_SWITCH_MS = 160;     // how long a lane change takes
  const GROUND_Y = 0;             // cup runs on the y=0 plane
  const JUMP_VY = 9.0;            // initial upward velocity on jump
  const GRAVITY = 22.0;           // downward acceleration
  const OBSTACLE_POOL_SIZE = 12;  // how many obstacles we keep alive
  const OBSTACLE_START_Z = -70;   // far ahead
  const OBSTACLE_END_Z = 6;      // past the cup
  const RECYCLE_Z = -85;         // where recycled obstacles re-enter

  // Speed (units per second the world scrolls past the cup)
  const BASE_SPEED = 12;
  const MAX_SPEED = 28;
  const SPEED_RAMP = 0.32;        // speed added per second of run time
  const SPAWN_INTERVAL = 1.1;     // seconds between spawns
  const SPAWN_JITTER = 0.45;      // ± fraction
  const SCORE_PER_SECOND = 10;    // score climbs this fast

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
    nextSpawn: SPAWN_INTERVAL,
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
    pointerActive: false,
  };

  // -----------------------------------------------------------------------
  // Three.js setup
  // -----------------------------------------------------------------------
  if (!window.THREE) {
    console.error('Three.js failed to load. Coffee Escape cannot start.');
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfff1d6);
  scene.fog = new THREE.Fog(0xfff1d6, 30, 95);

  const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 200);
  camera.position.set(0, 2.6, 4.5);
  camera.lookAt(0, 1.0, -8);

  const renderer = new THREE.WebGLRenderer({
    canvas: CANVAS,
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(0xfff1d6, 1);

  // Lighting
  const hemi = new THREE.HemisphereLight(0xfff1d6, 0xb87333, 0.65);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe5b0, 0.7);
  sun.position.set(4, 10, -3);
  scene.add(sun);

  // -----------------------------------------------------------------------
  // Textures (canvas-generated at startup, no external assets)
  // -----------------------------------------------------------------------
  function makeStripesTexture() {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#c08650';
    g.fillRect(0, 0, 64, 256);
    g.fillStyle = '#a86d3a';
    for (let i = 0; i < 64; i += 8) g.fillRect(0, i, 64, 2);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 24);
    return tex;
  }

  function makeWallTexture() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#f4d6a8';
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(178, 94, 0, 0.15)';
    for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 16, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 1);
    return tex;
  }

  function makeCeilingTexture() {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#fff7e0';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#e7c08a';
    g.strokeStyle = '#caa274';
    g.lineWidth = 2;
    for (let y = 0; y < 128; y += 32) {
      for (let x = 0; x < 128; x += 32) {
        g.fillRect(x + 4, y + 4, 24, 24);
        g.strokeRect(x + 4, y + 4, 24, 24);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 16);
    return tex;
  }

  // -----------------------------------------------------------------------
  // Hallway
  // -----------------------------------------------------------------------
  // Floor: long plane, scrolled by shifting the texture's offset.
  const floorTex = makeStripesTexture();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 200),
    new THREE.MeshLambertMaterial({ map: floorTex })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.position.z = -80;
  scene.add(floor);

  // Walls: two planes on either side of the hallway.
  const wallTex = makeWallTexture();
  const wallMat = new THREE.MeshLambertMaterial({ map: wallTex, side: THREE.FrontSide });
  const wallL = new THREE.Mesh(new THREE.PlaneGeometry(200, 6), wallMat);
  wallL.rotation.y = Math.PI / 2;
  wallL.position.set(-3, 3, -80);
  scene.add(wallL);
  const wallR = wallL.clone();
  wallR.rotation.y = -Math.PI / 2;
  wallR.position.set(3, 3, -80);
  scene.add(wallR);

  // Ceiling
  const ceilingTex = makeCeilingTexture();
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 200),
    new THREE.MeshLambertMaterial({ map: ceilingTex })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 6;
  ceiling.position.z = -80;
  scene.add(ceiling);

  // Two side rails so the lane boundaries are visible.
  const railMat = new THREE.MeshLambertMaterial({ color: 0xb87333 });
  const railGeo = new THREE.BoxGeometry(0.08, 0.05, 200);
  const railL = new THREE.Mesh(railGeo, railMat);
  railL.position.set(-0.8, 0.025, -80);
  scene.add(railL);
  const railR = railL.clone();
  railR.position.x = 0.8;
  scene.add(railR);

  // -----------------------------------------------------------------------
  // Cup (player) — cute takeaway coffee cup with sleeve, coffee top,
  // face, and little running limbs. Built from primitives so the game
  // stays lightweight and loads fast on phones.
  // -----------------------------------------------------------------------
  const cup = new THREE.Group();

  // Materials reused across the cup
  const matCupBody  = new THREE.MeshLambertMaterial({ color: 0xfaf3e3 }); // warm cream
  const matRim      = new THREE.MeshLambertMaterial({ color: 0xe8d8b8 }); // darker cream
  const matCoffee   = new THREE.MeshLambertMaterial({ color: 0x3a1f08 }); // very dark brown
  const matCrema    = new THREE.MeshLambertMaterial({ color: 0x8a5a2c }); // light brown ring
  const matSleeve   = new THREE.MeshLambertMaterial({ color: 0xc98a4d }); // cardboard tan
  const matSleeveRim= new THREE.MeshLambertMaterial({ color: 0xa86d3a }); // darker tan (top/bottom edges of sleeve)
  const matLogo     = new THREE.MeshLambertMaterial({ color: 0xff5a1f }); // brand orange
  const matFace     = new THREE.MeshLambertMaterial({ color: 0x1a0a02 }); // near-black
  const matCheek    = new THREE.MeshLambertMaterial({ color: 0xff8a6b, transparent: true, opacity: 0.55 });
  const matLimb     = new THREE.MeshLambertMaterial({ color: 0x5a3a14 }); // dark brown
  const matHand     = new THREE.MeshLambertMaterial({ color: 0xe7b78f }); // skin tone
  const matShoe     = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const matSteam    = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 });

  // Body: a slightly tapered cylinder. Top is slightly wider than the
  // bottom so the cup reads as a takeaway, not a barrel.
  const cupBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.40, 0.34, 0.85, 16),
    matCupBody
  );
  cupBody.position.y = 0.55;
  cup.add(cupBody);

  // Rim around the top of the cup (slightly recessed, gives the cup
  // a "real" lip).
  const cupRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.40, 0.04, 8, 24),
    matRim
  );
  cupRim.rotation.x = Math.PI / 2;
  cupRim.position.y = 0.98;
  cup.add(cupRim);

  // Coffee surface inside the rim (slightly lower than the rim).
  const coffeeSurface = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.36, 0.02, 16),
    matCoffee
  );
  coffeeSurface.position.y = 0.965;
  cup.add(coffeeSurface);

  // Crema ring (a tiny inner disc that suggests coffee with milk).
  const crema = new THREE.Mesh(
    new THREE.CylinderGeometry(0.20, 0.20, 0.005, 12),
    matCrema
  );
  crema.position.y = 0.978;
  cup.add(crema);

  // Cardboard sleeve around the lower-middle of the cup. This is what
  // makes the cup instantly read as a takeaway coffee.
  const sleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.40, 0.32, 16, 1, true),
    matSleeve
  );
  sleeve.position.y = 0.36;
  cup.add(sleeve);

  // Top and bottom rims of the sleeve.
  const sleeveRimTop = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.025, 6, 16),
    matSleeveRim
  );
  sleeveRimTop.rotation.x = Math.PI / 2;
  sleeveRimTop.position.y = 0.52;
  cup.add(sleeveRimTop);
  const sleeveRimBot = sleeveRimTop.clone();
  sleeveRimBot.position.y = 0.20;
  cup.add(sleeveRimBot);

  // Logo on the sleeve (front-facing, toward the camera at +Z).
  // Built as a small heart from a few primitives.
  const logoGroup = new THREE.Group();
  logoGroup.position.set(0, 0.36, 0.42);
  // Two lobes of a heart (small spheres) and a small wedge at the bottom.
  const logoLobeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), matLogo);
  logoLobeL.position.set(-0.045, 0.02, 0);
  logoGroup.add(logoLobeL);
  const logoLobeR = logoLobeL.clone();
  logoLobeR.position.x = 0.045;
  logoGroup.add(logoLobeR);
  const logoTip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.10, 4), matLogo);
  logoTip.rotation.x = Math.PI;
  logoTip.position.set(0, -0.06, 0);
  logoGroup.add(logoTip);
  cup.add(logoGroup);

  // Face: two eyes (spheres) + a smile (small torus segment) on the
  // front of the cup. The cup's +Z face is what the camera sees
  // (camera is at world +Z looking toward -Z).
  const faceGroup = new THREE.Group();
  faceGroup.position.set(0, 0.78, 0.41);

  // Eyes
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), matFace);
  eyeL.position.set(-0.10, 0, 0);
  faceGroup.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.10;
  faceGroup.add(eyeR);
  // Tiny white highlights on the eyes for cuteness
  const matHighlight = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const hlL = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), matHighlight);
  hlL.position.set(-0.085, 0.018, 0.035);
  faceGroup.add(hlL);
  const hlR = hlL.clone();
  hlR.position.x = 0.115;
  faceGroup.add(hlR);
  // Smile — half-torus on the front
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI),
    matFace
  );
  smile.rotation.x = Math.PI / 2;
  smile.position.set(0, -0.06, 0);
  // Flip the smile so the open side faces up
  smile.rotation.z = Math.PI;
  faceGroup.add(smile);
  // Cheek blushes
  const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), matCheek);
  cheekL.position.set(-0.16, -0.04, 0.01);
  faceGroup.add(cheekL);
  const cheekR = cheekL.clone();
  cheekR.position.x = 0.16;
  faceGroup.add(cheekR);
  cup.add(faceGroup);

  // Arms — pivoted from the shoulder, so they swing cleanly. Each arm
  // is a Group: shoulder pivot + cylinder + hand sphere.
  const armLGroup = new THREE.Group();
  armLGroup.position.set(-0.38, 0.66, 0);
  const armLMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.40, 8), matLimb);
  armLMesh.position.y = -0.20;
  armLGroup.add(armLMesh);
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), matHand);
  handL.position.y = -0.40;
  armLGroup.add(handL);
  cup.add(armLGroup);

  const armRGroup = new THREE.Group();
  armRGroup.position.set(0.38, 0.66, 0);
  const armRMesh = armLMesh.clone();
  armRMesh.position.y = -0.20;
  armRGroup.add(armRMesh);
  const handR = handL.clone();
  handR.position.y = -0.40;
  armRGroup.add(handR);
  cup.add(armRGroup);

  // Legs — pivoted from the hip, with a shoe at the end.
  const legLGroup = new THREE.Group();
  legLGroup.position.set(-0.14, 0.14, 0);
  const legLMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.32, 8), matLimb);
  legLMesh.position.y = -0.16;
  legLGroup.add(legLMesh);
  const shoeL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), matShoe);
  shoeL.scale.set(1, 0.5, 1.3);
  shoeL.position.set(0, -0.32, 0.02);
  legLGroup.add(shoeL);
  cup.add(legLGroup);

  const legRGroup = new THREE.Group();
  legRGroup.position.set(0.14, 0.14, 0);
  const legRMesh = legLMesh.clone();
  legRMesh.position.y = -0.16;
  legRGroup.add(legRMesh);
  const shoeR = shoeL.clone();
  shoeR.position.set(0, -0.32, 0.02);
  legRGroup.add(shoeR);
  cup.add(legRGroup);

  // Steam: three small spheres that drift up from the coffee surface.
  // They live in a Group that bobs naturally with the run animation.
  const steamGroup = new THREE.Group();
  steamGroup.position.set(0, 1.0, 0);
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), matSteam);
    s.position.set((i - 1) * 0.08, i * 0.12, 0);
    s.userData.phase = i * 1.2;
    steamGroup.add(s);
  }
  cup.add(steamGroup);

  // The whole cup lives at y=0 (feet on the ground). The `cup.position.y`
  // is offset by the player's jump height in the update loop.
  cup.position.set(LANE_X[1], 0, 0);
  scene.add(cup);

  // -----------------------------------------------------------------------
  // Tired man (chaser)
  // -----------------------------------------------------------------------
  // Lives behind the cup on the left side. He runs in place relative to
  // the camera. Commit A just makes him visible and animated; the trip
  // gag lands in a follow-up commit.
  const man = new THREE.Group();

  const manBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 1.0, 10),
    new THREE.MeshLambertMaterial({ color: 0xa04a2a })
  );
  manBody.position.y = 0.9;
  man.add(manBody);

  const manHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xe7b78f })
  );
  manHead.position.y = 1.6;
  man.add(manHead);

  // Hair patch on top (small flattened sphere).
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0x3a2a1a })
  );
  hair.position.y = 1.7;
  man.add(hair);

  // Two arms.
  const manArmGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6);
  const manArmL = new THREE.Mesh(manArmGeo, new THREE.MeshLambertMaterial({ color: 0xa04a2a }));
  manArmL.position.set(-0.45, 1.0, 0);
  man.add(manArmL);
  const manArmR = manArmL.clone();
  manArmR.position.x = 0.45;
  man.add(manArmR);

  // Two legs.
  const manLegGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.7, 6);
  const manLegL = new THREE.Mesh(manLegGeo, new THREE.MeshLambertMaterial({ color: 0x2b3a55 }));
  manLegL.position.set(-0.15, 0.25, 0);
  man.add(manLegL);
  const manLegR = manLegL.clone();
  manLegR.position.x = 0.15;
  man.add(manLegR);

  man.position.set(LANE_X[0] - 0.6, 0, 4.0);
  scene.add(man);

  // -----------------------------------------------------------------------
  // Obstacle factory
  // -----------------------------------------------------------------------
  const OBSTACLE_COLORS = {
    chair: 0x7d3f1c,
    table: 0x8a4a1f,
    sofa: 0x9a5a2a,
    lamp: 0xffb347,
    box: 0xcaa274,
  };

  function makeObstacle(kind) {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: OBSTACLE_COLORS[kind] || 0x888888 });

    if (kind === 'chair') {
      // Seat
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.6), mat);
      seat.position.y = 0.45;
      group.add(seat);
      // Back
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.08), mat);
      back.position.set(0, 0.9, -0.26);
      group.add(back);
      // Four legs
      const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 6);
      const offsets = [[-0.24, 0.22], [0.24, 0.22], [-0.24, -0.22], [0.24, -0.22]];
      for (const [x, z] of offsets) {
        const leg = new THREE.Mesh(legGeo, mat);
        leg.position.set(x, 0.225, z);
        group.add(leg);
      }
    } else if (kind === 'table') {
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.7), mat);
      top.position.y = 0.75;
      group.add(top);
      const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.75, 6);
      const offsets = [[-0.5, 0.28], [0.5, 0.28], [-0.5, -0.28], [0.5, -0.28]];
      for (const [x, z] of offsets) {
        const leg = new THREE.Mesh(legGeo, mat);
        leg.position.set(x, 0.375, z);
        group.add(leg);
      }
    } else if (kind === 'sofa') {
      // Wide — spans 2 lanes (callers should set `wide: true`).
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.7), mat);
      seat.position.y = 0.3;
      group.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.1), mat);
      back.position.set(0, 0.7, -0.3);
      group.add(back);
      const armGeo = new THREE.BoxGeometry(0.1, 0.4, 0.7);
      const armL = new THREE.Mesh(armGeo, mat);
      armL.position.set(-0.85, 0.4, 0);
      group.add(armL);
      const armR = armL.clone();
      armR.position.x = 0.85;
      group.add(armR);
    } else if (kind === 'lamp') {
      // Tall thin — must jump.
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), mat);
      pole.position.y = 0.8;
      group.add(pole);
      const shade = new THREE.Mesh(
        new THREE.ConeGeometry(0.35, 0.4, 10, 6),
        new THREE.MeshLambertMaterial({ color: 0xffe5b0 })
      );
      shade.position.y = 1.7;
      group.add(shade);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 8), mat);
      base.position.y = 0.03;
      group.add(base);
    } else if (kind === 'box') {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), mat);
      box.position.y = 0.35;
      group.add(box);
    }

    // Simple hitbox metadata for the collision system.
    return {
      kind: kind,
      lane: 1,
      z: OBSTACLE_START_Z,
      mesh: group,
      wide: kind === 'sofa', // sofa blocks 2 adjacent lanes
    };
  }

  // Pre-allocate a pool of obstacles so we never create/destroy mid-run.
  function initObstaclePool() {
    const types = ['chair', 'table', 'sofa', 'lamp', 'box'];
    for (let i = 0; i < OBSTACLE_POOL_SIZE; i++) {
      const kind = types[i % types.length];
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
  function spawnNext() {
    // Find a free obstacle in the pool.
    const ob = state.obstacles.find(o => !o.mesh.visible);
    if (!ob) return;

    // Pick a kind. Weights lean toward common, easy-to-jump items.
    const types = ['chair', 'table', 'sofa', 'lamp', 'box'];
    const weights = [4, 2, 2, 2, 3];
    let total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let kind = types[0];
    for (let i = 0; i < types.length; i++) {
      if (r < weights[i]) { kind = types[i]; break; }
      r -= weights[i];
    }
    // Rebuild the mesh contents for the picked kind (so the pool
    // genuinely has varied obstacles, not just 5 rotating shapes).
    rebuildObstacle(ob, kind);

    ob.lane = Math.floor(Math.random() * 3);
    ob.z = OBSTACLE_START_Z - Math.random() * 4;
    ob.mesh.position.set(LANE_X[ob.lane], 0, ob.z);
    ob.mesh.visible = true;
  }

  function rebuildObstacle(ob, kind) {
    // Clear the old group, then build a fresh one matching the new kind.
    while (ob.mesh.children.length) {
      const c = ob.mesh.children.pop();
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    ob.kind = kind;
    ob.wide = kind === 'sofa';
    ob.mesh.add(...makeObstacle(kind).mesh.children);
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
  function tryJump() {
    if (!state.running || state.gameOver) return;
    if (state.player.onGround) {
      state.player.vy = JUMP_VY;
      state.player.onGround = false;
    }
  }

  function tryLane(target) {
    if (!state.running || state.gameOver) return;
    if (target < 0 || target > 2) return;
    if (state.player.targetLane === target) return;
    state.player.targetLane = target;
    state.player.laneFromX = state.player.laneX;
    state.player.laneToX = LANE_X[target];
    state.player.laneSwitchT = 0;
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

  // Tap zones on the canvas: left third = lane left, right third = lane
  // right, center third = jump. Pointer down also starts a swipe; a
  // quick horizontal drag counts as a lane change too.
  function onStagePointerDown(e) {
    if (e.target.closest('button, a')) return;
    if (!state.running || state.gameOver) return;
    const rect = CANVAS.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const third = rect.width / 3;
    if (x < third) {
      tryLane(state.player.targetLane - 1);
    } else if (x > 2 * third) {
      tryLane(state.player.targetLane + 1);
    } else {
      tryJump();
    }
    state.pointerStartX = e.clientX;
    state.pointerStartT = performance.now();
    state.pointerActive = true;
  }
  function onStagePointerUp(e) {
    if (!state.pointerActive) return;
    state.pointerActive = false;
    const dx = (e.clientX || 0) - (state.pointerStartX || 0);
    const dt = performance.now() - (state.pointerStartT || 0);
    if (dt < 250 && Math.abs(dx) > 30) {
      if (dx < -30) tryLane(state.player.targetLane - 1);
      else if (dx > 30) tryLane(state.player.targetLane + 1);
    }
  }

  JUMP_BTN.addEventListener('click', e => { e.preventDefault(); tryJump(); });

  // -----------------------------------------------------------------------
  // Cutscene (unchanged from v1.x)
  // -----------------------------------------------------------------------
  let cutsceneTimers = [];
  function clearCutsceneTimers() {
    cutsceneTimers.forEach(t => clearTimeout(t));
    cutsceneTimers = [];
  }
  function hideCutscene() {
    CUTSCENE.hidden = true;
    CUTSCENE.style.display = 'none';
    CUTSCENE.querySelectorAll('.ce-scene').forEach(s => s.classList.remove('active'));
    SCENE_DOTS.forEach(d => d.classList.remove('on'));
  }
  function playCutscene() {
    clearCutsceneTimers();
    CUTSCENE.style.display = '';
    CUTSCENE.hidden = false;
    START_OVERLAY.hidden = true;
    GAME_OVER_OVERLAY.hidden = true;
    CUTSCENE_START_BTN.hidden = true;

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
        if (isLast) CUTSCENE_START_BTN.hidden = false;
      }, i * SCENE_DURATION_MS));
    }
    cutsceneTimers.push(setTimeout(() => {
      hideCutscene();
      beginRun();
    }, TOTAL_SCENES * SCENE_DURATION_MS + 600));
  }
  function skipCutscene() {
    clearCutsceneTimers();
    hideCutscene();
    beginRun();
  }
  function endCutscene() {
    clearCutsceneTimers();
    hideCutscene();
    beginRun();
  }

  // -----------------------------------------------------------------------
  // Run lifecycle
  // -----------------------------------------------------------------------
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
    state.speed = BASE_SPEED;
    state.nextSpawn = SPAWN_INTERVAL;
    state.shake = 0;
    state.flash = 0;
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
    SCORE_EL.textContent = '0';
  }

  function beginRun() {
    resetWorld();
    state.running = true;
    HUD.hidden = false;
    if (HINT) HINT.hidden = false;
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
    // Difficulty: speed slowly rises.
    state.speed = Math.min(MAX_SPEED, BASE_SPEED + state.worldTime * SPEED_RAMP);
    // Score climbs with time.
    state.score = Math.floor(state.worldTime * SCORE_PER_SECOND);

    // Lane interpolation
    const p = state.player;
    if (p.laneSwitchT < 1) {
      p.laneSwitchT = Math.min(1, p.laneSwitchT + dt * 1000 / LANE_SWITCH_MS);
      const t = p.laneSwitchT;
      // Ease out cubic
      const e = 1 - Math.pow(1 - t, 3);
      p.laneX = p.laneFromX + (p.laneToX - p.laneFromX) * e;
      if (t >= 1) p.lane = p.targetLane;
    }

    // Jump physics
    p.vy -= GRAVITY * dt;
    p.y += p.vy * dt;
    if (p.y <= 0) {
      p.y = 0;
      p.vy = 0;
      p.onGround = true;
    } else {
      p.onGround = false;
    }
    p.runAnim += dt * Math.max(8, state.speed / 0.3);

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

    // Lane-change bank: roll around the z-axis a bit during a switch.
    let bank = 0;
    if (p.laneSwitchT < 1) {
      const m = p.laneSwitchT;
      const peak = Math.sin(m * Math.PI); // 0..1..0
      bank = (p.laneToX - p.laneFromX) * 0.5 * peak;
    }

    // Forward tilt while sprinting (slight), upright while jumping.
    // The tumble is a forward roll, which is rotation around the
    // local X axis. Combine tilt + tumble by adding them.
    const runTilt = p.onGround ? 0.10 : 0;
    let tiltX = -runTilt;
    if (!p.onGround) {
      if (p.airT === undefined) p.airT = 0;
      p.airT += dt;
      // One full forward flip per ~0.7s of air time.
      tiltX += p.airT * (2 * Math.PI / 0.7);
    } else {
      p.airT = 0;
    }
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

    // Spawn obstacles
    state.nextSpawn -= dt;
    if (state.nextSpawn <= 0) {
      spawnNext();
      state.nextSpawn = SPAWN_INTERVAL * (1 - SPAWN_JITTER + Math.random() * SPAWN_JITTER * 2);
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
      // Sofas are wide; they only collide if the player is in one
      // of the two lanes the sofa covers. Single-lane items only
      // collide in their own lane.
      if (o.wide) {
        const covered = [o.lane === 0 ? 0 : o.lane - 1, o.lane === 2 ? 2 : o.lane + 1];
        if (!covered.includes(p.lane)) continue;
      } else {
        if (o.lane !== p.lane) continue;
      }
      _obBox.setFromObject(o.mesh);
      if (_playerBox.intersectsBox(_obBox)) {
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

    // Camera follows the cup with a slight x lag.
    camera.position.x += (p.laneX * 0.45 - camera.position.x) * Math.min(1, dt * 8);
    camera.position.y = 2.6 + p.y * 0.3;
    camera.position.z = 4.5;
    _tmpVec.set(p.laneX * 0.2, 1.0 + p.y * 0.2, -8);
    camera.lookAt(_tmpVec);

    // Screen shake
    if (state.shake > 0) {
      camera.position.x += (Math.random() - 0.5) * state.shake;
      camera.position.y += (Math.random() - 0.5) * state.shake;
    }

    state.shake = Math.max(0, state.shake - dt * 2.2);
    state.flash = Math.max(0, state.flash - dt * 3);

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
    STAGE.addEventListener('pointerdown', onStagePointerDown);
    STAGE.addEventListener('pointerup', onStagePointerUp);
    STAGE.addEventListener('pointercancel', onStagePointerUp);
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
})();
