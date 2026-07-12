// @ts-nocheck
import * as THREE from 'three';
import { submitScore as platformSubmitScore } from '@shared/leaderboard/client';
import {
  STORAGE_KEY,
  LANE_X,
  LANE_SWITCH_MS,
  GROUND_Y,
  JUMP_VY,
  GRAVITY,
  OBSTACLE_POOL_SIZE,
  OBSTACLE_START_Z,
  OBSTACLE_END_Z,
  RECYCLE_Z,
  BASE_SPEED,
  MAX_SPEED,
  SPEED_RAMP,
  SPEED_GRACE_SECONDS,
  SPAWN_INTERVAL_START,
  SPAWN_INTERVAL_MIN,
  SPAWN_RAMP_SECONDS,
  SPAWN_JITTER,
  PAIR_SPAWN_BASE,
  PAIR_SPAWN_RAMP,
  SAME_LANE_MIN_GAP,
  BEAN_SPAWN_CHANCE,
  BEAN_INTERVAL_MIN,
  BEAN_INTERVAL_MAX,
  SCORE_PER_SECOND,
  BEAN_POOL_SIZE,
} from './engine/constants';
import {
  makeFloorTexture,
  makeWallTexture,
  makeCeilingTexture,
  makePictureTexture,
} from './engine/textures';
import { OBSTACLE_KINDS } from './entities/obstacleKinds';
import { buildObstacleMeshes } from './entities/buildObstacleMeshes';

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

// -----------------------------------------------------------------------
  // DOM references
  // -----------------------------------------------------------------------
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
  const FINAL_SCORE_ITEM = document.getElementById('ceFinalScoreItem');
  const FINAL_BEST_ITEM = document.getElementById('ceFinalBestItem');
  const RUN_STAMP = document.getElementById('ceRunStamp');
  // Global leaderboard submit form (in the game-over card).
  const LB_FORM = document.getElementById('ceLbSubmit');
  const LB_NICK_EL = document.getElementById('ceLbNick');
  const LB_SUBMIT_BTN = document.getElementById('ceLbSubmitBtn');
  const LB_STATUS_EL = document.getElementById('ceLbStatus');
  const START_OVERLAY = document.getElementById('ceStartOverlay');
  const GAME_OVER_OVERLAY = document.getElementById('ceGameOverOverlay');
  const START_BTN = document.getElementById('ceStartBtn');
  const TRY_AGAIN_BTN = document.getElementById('ceTryAgainBtn');
  const RESET_BEST_BTN = document.getElementById('ceResetBest');
  const JUMP_BTN = document.getElementById('ceJumpBtn');
  const BOOST_BTN = document.getElementById('ceBoostBtn');
  const BOOST_FILL = document.getElementById('ceBoostFill');
  const BOOST_HUD_FILL = document.getElementById('ceBoostHudFill');
  const HINT = document.getElementById('ceHint');

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

  // -----------------------------------------------------------------------
  // Three.js setup
  // -----------------------------------------------------------------------
  if (!THREE) {
    console.error('Three.js failed to load. Coffee Escape cannot start.');
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfff1d6);
  // Warm fog for depth — closer near, fading to a deep warm color in
  // the distance. Boosts the "long hallway" feel.
  scene.fog = new THREE.Fog(0xffd9a8, 22, 90);

  const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 200);
  const cameraBaseY = 2.6;
  const cameraBaseZ = 4.5;
  camera.position.set(0, cameraBaseY, cameraBaseZ);
  camera.lookAt(0, 1.0, -8);

  const renderer = new THREE.WebGLRenderer({
    canvas: CANVAS,
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(0xfff1d6, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Lighting — three lights for depth:
  //  - Hemi: ambient sky/ground bounce (cream / warm tan)
  //  - Sun: warm key light from the front-right
  //  - Fill: a cooler fill from the back-left so the cup doesn't go
  //    pitch-black on the side facing away from the sun
  const hemi = new THREE.HemisphereLight(0xfff1d6, 0xb87333, 0.70);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe5b0, 0.95);
  sun.position.set(4, 10, -3);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xc8d8ff, 0.30);
  fill.position.set(-5, 6, 2);
  scene.add(fill);
  // Subtle warm rim from the floor — a soft point light near the
  // cup so the underside of the cup catches a hint of warm bounce.
  const rim = new THREE.PointLight(0xffb070, 0.4, 8, 2);
  rim.position.set(0, 0.5, 2);
  scene.add(rim);

  // Textures imported from ./engine/textures

  // -----------------------------------------------------------------------
  // Hallway — warm coffee/office environment
  // -----------------------------------------------------------------------
  // Floor: long plane, scrolled by shifting the texture's offset.
  const floorTex = makeFloorTexture();
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
  const railMat = new THREE.MeshLambertMaterial({ color: 0x8a5a2c });
  const railGeo = new THREE.BoxGeometry(0.08, 0.05, 200);
  const railL = new THREE.Mesh(railGeo, railMat);
  railL.position.set(-0.8, 0.025, -80);
  scene.add(railL);
  const railR = railL.clone();
  railR.position.x = 0.8;
  scene.add(railR);

  // Skirting board at the bottom of the walls.
  const skirtMat = new THREE.MeshLambertMaterial({ color: 0x5a3a14 });
  const skirtL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 200), skirtMat);
  skirtL.position.set(-2.96, 0.09, -80);
  scene.add(skirtL);
  const skirtR = skirtL.clone();
  skirtR.position.x = 2.96;
  scene.add(skirtR);

  // Wall decorations (frames, lamps, plants, side tables) that scroll
  // past as the world moves. Each item is a small 3D Group.
  function makePictureFrame(variant, side) {
    const group = new THREE.Group();
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.6, 0.8),
      new THREE.MeshLambertMaterial({ color: 0x5a3a14 })
    );
    group.add(frame);
    const pic = new THREE.Mesh(
      new THREE.PlaneGeometry(0.65, 0.45),
      new THREE.MeshBasicMaterial({ map: makePictureTexture(variant) })
    );
    if (side === 'left') {
      pic.position.set(0.012, 0.05, 0);
    } else {
      pic.position.set(-0.012, 0.05, 0);
      pic.rotation.y = Math.PI;
    }
    group.add(pic);
    return group;
  }

  function makeWallLamp() {
    const group = new THREE.Group();
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.04, 0.04),
      new THREE.MeshLambertMaterial({ color: 0x3a2a1a })
    );
    group.add(arm);
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.16, 8),
      new THREE.MeshLambertMaterial({ color: 0xffe5b0, emissive: 0xffaa55, emissiveIntensity: 0.5 })
    );
    shade.position.y = -0.10;
    shade.rotation.x = Math.PI;
    group.add(shade);
    return group;
  }

  function makePlant() {
    const group = new THREE.Group();
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.12, 0.22, 10),
      new THREE.MeshLambertMaterial({ color: 0xb87333 })
    );
    pot.position.y = 0.11;
    group.add(pot);
    for (let i = 0; i < 3; i++) {
      const leaf = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.32, 6),
        new THREE.MeshLambertMaterial({ color: 0x4a8a3a })
      );
      leaf.position.set((i - 1) * 0.08, 0.36, 0);
      leaf.rotation.z = (i - 1) * 0.3;
      group.add(leaf);
    }
    return group;
  }

  function makeSideTable() {
    const group = new THREE.Group();
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.04, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x8a4a1f })
    );
    top.position.y = 0.85;
    group.add(top);
    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.85, 6);
    for (const [x, z] of [[-0.17, 0.42], [0.17, 0.42], [-0.17, -0.42], [0.17, -0.42]]) {
      const leg = new THREE.Mesh(legGeo, new THREE.MeshLambertMaterial({ color: 0x5a3a14 }));
      leg.position.set(x, 0, z);
      group.add(leg);
    }
    const mug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.08, 10),
      new THREE.MeshLambertMaterial({ color: 0xffffff })
    );
    mug.position.set(0.08, 0.91, 0);
    group.add(mug);
    return group;
  }

  // Decor pool. We allocate a fixed set and recycle their z to make
  // them scroll past. Spacing is the same as the ceiling tile period
  // so the visual rhythm matches.
  const DECOR_SPACING = 8;
  const decorItems = [];
  for (let i = 0; i < 26; i++) {
    const side = (i % 2 === 0) ? 'left' : 'right';
    const decorType = i % 4;
    let item;
    if (decorType === 0) {
      item = makePictureFrame(i % 4, side);
    } else if (decorType === 1) {
      item = makeWallLamp();
    } else if (decorType === 2) {
      item = makePlant();
    } else {
      item = makeSideTable();
    }
    // Scale up side decorations so they read as real house props.
    item.scale.setScalar(1.5);
    if (decorType === 0 || decorType === 1) {
      // Wall-mounted decor: orient so it faces the hall.
      item.rotation.y = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
      item.position.x = side === 'left' ? -2.95 : 2.95;
      item.position.y = 2.6;
    } else {
      // Floor decor: sit on the ground near the wall. Pulled
      // slightly inward so the 1.5× scaled props don't clip walls.
      item.position.x = side === 'left' ? -2.2 : 2.2;
      item.position.y = 0;
    }
    item.position.z = -i * DECOR_SPACING;
    scene.add(item);
    decorItems.push(item);
  }

  // -----------------------------------------------------------------------
  // Cup (player) — cute takeaway coffee cup with sleeve, coffee top,
  // face, and little running limbs. Built from primitives so the game
  // stays lightweight and loads fast on phones.
  // -----------------------------------------------------------------------
  const cup = new THREE.Group();

  // Materials reused across the cup
  const matCupBody  = new THREE.MeshLambertMaterial({ color: 0xffffff }); // pure white cup so it pops on the warm wood floor
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

  // Soft contact shadow under the cup. A flat dark disc that
  // follows the cup, shrinks when the cup is in the air, and fades
  // out. Slightly larger and darker than v2.3 so the cup reads as
  // grounded against the warm wood floor.
  const contactShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.48, 24),
    new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false,
    })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(LANE_X[1], 0.012, 0);
  contactShadow.renderOrder = 1; // draw after the floor
  scene.add(contactShadow);

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
  // Coffee bean collectibles
  // -----------------------------------------------------------------------
  // Floating beans that the cup can collect by jumping into. Each
  // bean is a small group: an oval (scaled sphere) + a darker line
  // down the middle. They rotate slowly and bob in place.
  const beans = [];
  function makeBean() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0x4a2a10 })
    );
    body.scale.set(1, 0.6, 0.7);
    group.add(body);
    // The center line — a thinner sphere, slightly larger in z, lighter
    // color, so it looks like a coffee bean crease.
    const crease = new THREE.Mesh(
      new THREE.SphereGeometry(0.135, 10, 6),
      new THREE.MeshBasicMaterial({ color: 0x8a5a2c })
    );
    crease.scale.set(0.4, 0.6, 0.72);
    group.add(crease);
    // Subtle glow ring under the bean (small bright sphere).
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.20, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffe5b0, transparent: true, opacity: 0.30 })
    );
    group.add(halo);
    return {
      mesh: group,
      lane: 1,
      z: -50,
      y: 1.0,             // floats at jump height
      rot: 0,             // accumulated rotation
      active: false,
    };
  }
  for (let i = 0; i < BEAN_POOL_SIZE; i++) {
    const b = makeBean();
    b.mesh.visible = false;
    scene.add(b.mesh);
    beans.push(b);
  }
  state.beans = beans;

  // -----------------------------------------------------------------------
  // Ambient motes (dust / coffee aroma in the air)
  // -----------------------------------------------------------------------
  // 16 small semi-transparent spheres scattered in a wide volume
  // around the cup. Each has a slow drift (its own sin-based
  // motion) and recycles when it drifts past the camera. Adds depth
  // to the hallway without being noticeable as "particles."
  const MOTE_COUNT = 26;
  const motes = [];
  for (let i = 0; i < MOTE_COUNT; i++) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.40 })
    );
    m.position.set(
      (Math.random() - 0.5) * 6,
      1.2 + Math.random() * 4.5,
      -10 - Math.random() * 70
    );
    m.userData.phase = Math.random() * Math.PI * 2;
    m.userData.driftY = 0.4 + Math.random() * 0.4;
    scene.add(m);
    motes.push(m);
  }
  state.motes = motes;

  // -----------------------------------------------------------------------
  // Dust / burst particle pool
  // -----------------------------------------------------------------------
  // Short-lived colored spheres used for bean-collect bursts and
  // future effects. Each entry has a mesh + a physics record.
  const DUST_POOL_SIZE = 32;
  const dustPool = [];
  for (let i = 0; i < DUST_POOL_SIZE; i++) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.10, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.9 })
    );
    m.visible = false;
    scene.add(m);
    dustPool.push({
      mesh: m,
      life: 0,
      maxLife: 0.5,
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
      r: 0.18,
      color: '#ffd24a',
    });
  }

  // -----------------------------------------------------------------------
  // Boost particle pool
  // -----------------------------------------------------------------------
  // Small blue particles emitted behind the cup while boost is
  // active. Each particle drifts up and fades out.
  const BOOST_PARTICLE_POOL = 24;
  const boostParticles = [];
  for (let i = 0; i < BOOST_PARTICLE_POOL; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.10, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0x6ec6ff, transparent: true, opacity: 0.8 })
    );
    p.visible = false;
    scene.add(p);
    boostParticles.push({
      mesh: p,
      life: 0,
      maxLife: 0.5,
      vy: 0,
    });
  }
  state.boostParticles = boostParticles;

  // Boost glow — a soft transparent sphere around the cup that's
  // visible while boost is active. Pulses slightly.
  const boostGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0x6ec6ff, transparent: true, opacity: 0 })
  );
  boostGlow.position.set(0, 0.5, 0);
  scene.add(boostGlow);

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
    const meta = OBSTACLE_KINDS[kind];
    // Tall obstacles (watercooler, filingcabinet) need a real
    // jump. Make them available earlier (12s) so the hallway
    // gets more vertical variety after the first 10 seconds.
    if (meta.jumpHeight > 0.7 && state.worldTime < 12) return false;
    return true;
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
    const kinds = Object.keys(OBSTACLE_KINDS);
    const available = kinds.filter(kindAvailable);
    if (available.length === 0) return 'chair'; // safety
    // Base weights: easy kinds more common.
    const baseWeight = {
      spill: 4, cable: 3, mug: 3, chair: 5, box: 3, plant: 2,
      printer: 3, watercooler: 2, filingcabinet: 2, desk: 2, worker: 2,
    };
    // Ramp: 0 at t=0, 1 at t=40. Multiplied into the "harder" kinds
    // to bring them in gradually.
    const rampT = Math.min(1, state.worldTime / 40);
    // Harder kinds get boosted by the ramp so they appear more
    // often as the player gets comfortable.
    const hardBoost = {
      watercooler: 1.5, filingcabinet: 1.5, printer: 0.8,
      desk: 1.0, worker: 1.0,
    };
    // Wide obstacles (desk, worker) only after 15s (was 30s) so
    // they appear as a medium-difficulty pattern once the player
    // has the basics down.
    const w = {};
    for (const k of available) {
      w[k] = baseWeight[k] || 2;
      if (hardBoost[k]) w[k] += hardBoost[k] * rampT;
      if (OBSTACLE_KINDS[k].wide && state.worldTime < 15) w[k] = 0;
    }
    let total = 0;
    for (const k in w) total += w[k];
    if (total === 0) return 'chair';
    let r = Math.random() * total;
    for (const k in w) {
      if (r < w[k]) return k;
      r -= w[k];
    }
    return 'chair';
  }

  function spawnNext() {
    // Decide whether this spawn is a single obstacle or a pair.
    // The pair chance ramps up with worldTime so the first few
    // seconds are single, then the hallway starts showing
    // two-lane patterns (one safe lane).
    const pairChance = Math.min(0.45, PAIR_SPAWN_BASE + state.worldTime * PAIR_SPAWN_RAMP);
    const isPair = Math.random() < pairChance && state.worldTime > 6;

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
    // Same-lane recent obstacles: the distance between the new
    // obstacle and the last one in its lane is roughly
    // |lastObZ - OBSTACLE_START_Z| / (spawnInterval * speed). At
    // speed 36 and interval 0.45s, that's 16.2 units. If the last
    // lane is X and the gap is < SAME_LANE_MIN_GAP, the player
    // wouldn't have time to switch lanes, so avoid lane X.
    let avoid = -1;
    if (state.lastObLane >= 0) {
      // The lastObZ is at spawn (~-70). The new obstacle will be
      // at ~-70 too. The "distance" between them when both are
      // on screen is roughly the z difference at spawn, which is
      // small. So the practical question is: would two obstacles
      // in the same lane be back-to-back? Since spawn interval is
      // ~0.45s and the lane switch takes ~0.16s, if the last
      // obstacle hasn't been passed yet, we MUST avoid that lane.
      // For simplicity, always avoid the last lane on the next
      // single spawn. This guarantees a safe lane is always open
      // between consecutive single obstacles.
      avoid = state.lastObLane;
    }
    const choices = [0, 1, 2].filter(l => l !== avoid);
    return choices[Math.floor(Math.random() * choices.length)];
  }

  // Pick a z position for the new obstacle. We ensure the gap to
  // the last obstacle is at least minGap units so the player has
  // time to react at any speed. The minGap is based on the current
  // speed: at speed 12 we want ~6 units (0.5s reaction time), at
  // speed 36 we want ~14 units (0.39s). This is the "safe lane"
  // guarantee — consecutive obstacles are never closer than
  // ~0.4s of travel.
  function pickZ(_lane, _ob) {
    if (state.lastObZ <= -900) {
      // First spawn of the run.
      return OBSTACLE_START_Z - Math.random() * 4;
    }
    const minGap = Math.max(6, state.speed * 0.4);
    // Place the new obstacle behind the last one by at least
    // minGap units, with a small random extra gap for variety.
    return state.lastObZ - minGap - Math.random() * 2.5;
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

  function tryBoost() {
    if (!state.running || state.gameOver) return;
    if (state.boost.active) return;
    if (state.boost.meter < state.boost.cost) return;
    state.boost.active = true;
    state.boost.timer = state.boost.duration;
    // Lock the meter at its current level during the boost (visually
    // the bar stays full while boost is active). It'll drop to 0
    // when the boost ends.
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
    const isNewBest = state.score > state.best;
    if (isNewBest) {
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
    NEW_BEST_EL.hidden = !isNewBest;
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
        if (isNewBest) {
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

  function pickGameOverTitle(score) {
    if (score >= 200) return 'Legendary Espresso! ☕👑';
    if (score >= 100) return 'What a brew-tal run! ☕💨';
    if (score >= 50) return 'Caught! ☕😱';
    return 'Spat out! ☕😵';
  }

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
    const rampStart = Math.max(0, state.worldTime - SPEED_GRACE_SECONDS);
    state.speed = Math.min(MAX_SPEED, BASE_SPEED + rampStart * SPEED_RAMP);
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

    // Spawn obstacles. The interval ramps down from SPAWN_INTERVAL_START
    // (0.95s) to SPAWN_INTERVAL_MIN (0.45s) over SPAWN_RAMP_SECONDS
    // (25s), then stays at the minimum.
    state.nextSpawn -= dt;
    if (state.nextSpawn <= 0) {
      spawnNext();
      const rampT = Math.min(1, state.worldTime / SPAWN_RAMP_SECONDS);
      const baseInterval = SPAWN_INTERVAL_START + (SPAWN_INTERVAL_MIN - SPAWN_INTERVAL_START) * rampT;
      state.nextSpawn = baseInterval * (1 - SPAWN_JITTER + Math.random() * SPAWN_JITTER * 2);
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
      state.nextBean = BEAN_INTERVAL_MIN + Math.random() * (BEAN_INTERVAL_MAX - BEAN_INTERVAL_MIN);
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
      if (b.z > 6) {
        b.active = false;
        b.mesh.visible = false;
        continue;
      }
      // Collision with cup. Cup must be in the same lane, near the
      // bean's z, and above the floor (in the air or on the ground).
      if (b.lane === p.lane) {
        const dz = b.z - 0;
        if (Math.abs(dz) < 0.5 && p.y > 0.2) {
          collectBean(b);
        }
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

    // Boost meter: fills while running, freezes while active,
    // drops to 0 the instant the boost ends.
    if (state.boost.active) {
      state.boost.timer -= dt;
      if (state.boost.timer <= 0) {
        state.boost.active = false;
        state.boost.meter = 0;
      }
      // While active, the meter reads as the "cost" threshold
      // (so the bar visually stays at the level it was at when
      // boost was triggered). This avoids the bar jumping to 100
      // mid-boost and gives a "you've used it" feel.
      if (state.boost.meter < state.boost.cost) {
        state.boost.meter = state.boost.cost;
      }
    } else {
      // Fill over ~7 seconds to a full meter.
      state.boost.meter = Math.min(state.boost.max, state.boost.meter + dt * (100 / 7));
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
