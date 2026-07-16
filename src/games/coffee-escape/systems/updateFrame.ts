/**
 * Per-frame simulation + presentation side-effects (CE-local).
 * Pure rules stay in other systems; this mutates meshes/state for the loop.
 */
import * as THREE from 'three';
import {
  BEAN_INTERVAL_MAX,
  BEAN_INTERVAL_MIN,
  DOUBLE_JUMP_REACT_SEC,
  JUMP_VY,
  LANE_X,
  OBSTACLE_END_Z,
} from '../engine/constants';
import type { SectionId } from '../engine/sections';
import { sectionAtDistance, sectionLabel } from '../engine/sections';
import type { GameState } from '../engine/types';
import {
  OBSTACLE_KINDS,
  isObstacleKind,
} from '../entities/obstacleKinds';
import {
  beanRecyclePastCamera,
  blocksPlayerLane,
  canCollectBean,
} from './collisionLogic';
import {
  applyChaseBeanRelief,
  applyChaseHit,
  chaseProximity,
  isCaught,
  manXFromDanger,
  manZFromDanger,
  tickChase,
} from './chaseLogic';
import { nextBeanDelay, scoreFromTime, speedAtTime, tickBoost } from './pacingLogic';
import { burstDustAt } from './spawnController';
import { consumeJumpBuffer } from './playerActions';
import {
  cupTiltX,
  doubleJumpScale,
  laneBank,
  tickJump,
  tickLaneMotion,
  tickRunAnim,
} from './playerMotion';
import { nextSpawnDelay } from './spawnLogic';

export interface UpdateFrameCtx {
  state: GameState;
  dt: number;
  // character
  cup: THREE.Group;
  armLGroup: THREE.Group;
  armRGroup: THREE.Group;
  legLGroup: THREE.Group;
  legRGroup: THREE.Group;
  steamGroup: THREE.Group;
  contactShadow: THREE.Mesh;
  man: THREE.Group;
  manArmL: THREE.Object3D;
  manArmR: THREE.Object3D;
  manLegL: THREE.Object3D;
  manLegR: THREE.Object3D;
  // world
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  cameraBaseY: number;
  cameraBaseZ: number;
  /** Mutable env handle — floorTex/wallTex swap when the section changes. */
  env: {
    floorTex: THREE.CanvasTexture;
    wallTex: THREE.CanvasTexture;
    ceilingTex: THREE.CanvasTexture;
    pathTex?: THREE.CanvasTexture;
    decorItems: THREE.Object3D[];
    DECOR_SPACING: number;
    applySectionLook: (id: SectionId) => void;
  };
  boostGlow: THREE.Mesh;
  dustPool: Array<{
    mesh: THREE.Mesh;
    life: number;
    maxLife: number;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
  }>;
  // callbacks into runtime-owned helpers
  spawnNext: () => void;
  spawnBean: () => void;
  collectBean: (b: GameState['beans'][number]) => void;
  emitBoostParticle: () => void;
  onCrash: () => void;
  onSectionChange?: (id: SectionId, label: string) => void;
  // DOM
  scoreEl: HTMLElement | null;
  boostFill: HTMLElement | null;
  boostHudFill: HTMLElement | null;
  boostBtn: HTMLElement | null;
  chaseFill: HTMLElement | null;
  chaseHud: HTMLElement | null;
  // scratch
  playerBox: THREE.Box3;
  obBox: THREE.Box3;
  tmpVec: THREE.Vector3;
}

/** Returns true if the run should continue (false after fatal crash this frame). */
export function updateFrame(ctx: UpdateFrameCtx): boolean {
  const { state, dt } = ctx;
  state.worldTime += dt;
  state.speed = speedAtTime(state.worldTime);
  state.score = scoreFromTime(state.worldTime);

  // House-journey distance + section (shell look + obstacle bias)
  state.distance += state.speed * dt;
  const section = sectionAtDistance(state.distance);
  if (section.id !== state.sectionId) {
    state.sectionId = section.id;
    state.sectionCycle = section.cycleIndex;
    ctx.env.applySectionLook(section.id);
    state.flash = Math.max(state.flash, 0.08);
    ctx.onSectionChange?.(section.id, sectionLabel(section.id));
  } else {
    state.sectionCycle = section.cycleIndex;
  }

  const p = state.player;
  const wasAirborne = !p.onGround;

  // Buffered jump (early double-jump swipe / pre-land press) — apply before physics
  const buffered = consumeJumpBuffer(state, dt);
  if (buffered.ok && buffered.isDouble) {
    state.flash = Math.max(state.flash, 0.06);
    (state as GameState & { _doubleJumpPuff?: boolean })._doubleJumpPuff = true;
  }

  Object.assign(p, tickLaneMotion(p, dt, LANE_X));
  const jumped = tickJump(
    {
      y: p.y,
      vy: p.vy,
      onGround: p.onGround,
      airT: p.airT || 0,
      doubleBoostLeft: p.doubleBoostLeft || 0,
    },
    dt,
  );
  p.y = jumped.y;
  p.vy = jumped.vy;
  p.onGround = jumped.onGround;
  p.airT = jumped.airT;
  p.doubleBoostLeft = jumped.doubleBoostLeft ?? 0;
  // Reset double-jump budget on landing; clear react + boost
  if (p.onGround) {
    p.jumpsLeft = 2;
    p.doubleJumpReactT = 0;
    p.doubleBoostLeft = 0;
  } else if (wasAirborne && p.jumpsLeft > 2) {
    p.jumpsLeft = 2;
  }
  // Tick double-jump visual react (1 → 0) — smooth decay
  if (p.doubleJumpReactT > 0) {
    p.doubleJumpReactT = Math.max(0, p.doubleJumpReactT - dt / DOUBLE_JUMP_REACT_SEC);
  }
  p.runAnim = tickRunAnim(p.runAnim, dt, state.speed);

  // Soft steam puff when double jump fires (one gentle burst, not a double slap)
  const puffState = state as GameState & { _doubleJumpPuff?: boolean };
  if (puffState._doubleJumpPuff) {
    puffState._doubleJumpPuff = false;
    burstDustAt(
      ctx.dustPool as unknown as Parameters<typeof burstDustAt>[0],
      p.laneX,
      Math.max(0.12, p.y + 0.1),
      0,
      5,
    );
  }

  // Cup pose
  ctx.cup.position.x = p.laneX;
  const swing = Math.sin(p.runAnim) * 1.0;
  const bob = p.onGround ? Math.abs(Math.sin(p.runAnim * 2)) * 0.06 : 0;
  const react = p.doubleJumpReactT || 0;
  // Flip progress 0 at kick → 1 when react ends (smooth envelope)
  const flipProg = react > 0 ? 1 - Math.min(1, react) : 0;
  const flipWave = react > 0 ? Math.sin(flipProg * Math.PI) : 0; // 0→1→0
  ctx.armLGroup.rotation.x = swing;
  ctx.armRGroup.rotation.x = -swing;
  ctx.legLGroup.rotation.x = -swing * 0.7;
  ctx.legRGroup.rotation.x = swing * 0.7;
  if (!p.onGround) {
    // Air tuck from velocity + deeper tuck mid-flip (smooth, not snappy)
    const tuck = Math.min(0.7, Math.max(0, p.vy / JUMP_VY) * 0.5 + 0.18);
    const flipTuck = 0.55 * flipWave;
    ctx.legLGroup.rotation.x = -0.5 * tuck - 0.18 - flipTuck;
    ctx.legRGroup.rotation.x = -0.5 * tuck - 0.18 - flipTuck;
    ctx.armLGroup.rotation.x = -0.55 * tuck - 0.08 - flipTuck * 0.7;
    ctx.armRGroup.rotation.x = 0.55 * tuck + 0.08 + flipTuck * 0.7;
  }
  ctx.cup.rotation.x = cupTiltX(p.onGround, p.airT || 0, react);
  ctx.cup.rotation.z = laneBank(p.laneSwitchT, p.laneFromX, p.laneToX);
  // Soft non-uniform squash/stretch through the flip
  const sc = doubleJumpScale(react);
  ctx.cup.scale.set(sc.x, sc.y, sc.z);
  ctx.cup.position.y = p.y + bob + flipWave * 0.02;

  for (const child of ctx.steamGroup.children) {
    const ph = child.userData.phase || 0;
    const t = state.worldTime * 2 + ph;
    // Mild steam lift during double jump — not a jet engine
    const steamBoost = 1 + flipWave * 0.5;
    child.position.y = ((t * 0.4 * steamBoost) % 0.6) + 0.05 + flipWave * 0.05;
    child.position.x = (ph - 1) * 0.08 + Math.sin(t * 1.5) * 0.02;
    const k = 1 - (((t * 0.4) % 0.6) / 0.6);
    child.scale.setScalar((0.4 + k * 0.9) * (1 + flipWave * 0.18));
  }

  // Chase meter: passive creep / boost drain / i-frames
  state.chase = tickChase(state.chase, dt, {
    boostActive: state.boost.active,
  });

  // Tired man — clean run cycle; stays RIGHT + back so caffeine HUD stays free
  const prox = chaseProximity(state.chase);
  const manCadence = 0.8 + prox * 0.4;
  const manSwing = Math.sin(p.runAnim * manCadence) * (0.45 + prox * 0.25);
  const reach = 0.3 + prox * 0.4;
  ctx.manArmL.rotation.x = -manSwing * 0.75 - 0.12;
  ctx.manArmR.rotation.x = manSwing * 0.4 - reach;
  ctx.manArmL.rotation.z = -0.1;
  ctx.manArmR.rotation.z = 0.1;
  ctx.manLegL.rotation.x = manSwing * 0.8;
  ctx.manLegR.rotation.x = -manSwing * 0.8;
  // Gentle bob only — no huge lean into the camera
  ctx.man.position.y =
    Math.abs(Math.sin(p.runAnim * manCadence * 2)) * 0.035;
  ctx.man.rotation.x = 0.03 + prox * 0.04;
  ctx.man.rotation.y = -0.25 + p.laneX * 0.04;

  const manTargetZ = manZFromDanger(state.chase.danger, state.chase.max);
  const manTargetX = manXFromDanger(state.chase.danger, state.chase.max);
  ctx.man.position.z += (manTargetZ - ctx.man.position.z) * Math.min(1, dt * 3.5);
  ctx.man.position.x += (manTargetX - ctx.man.position.x) * Math.min(1, dt * 3);
  ctx.man.visible = true;
  // Base scale on the model (~0.9); slight urgency bump when close
  const base = 0.9;
  ctx.man.scale.setScalar(base * (1 + prox * 0.05));

  // Obstacles
  state.nextSpawn -= dt;
  if (state.nextSpawn <= 0) {
    ctx.spawnNext();
    state.nextSpawn = nextSpawnDelay(state.worldTime);
  }
  for (const o of state.obstacles) {
    if (!o.mesh.visible) continue;
    o.z += state.speed * dt;
    o.mesh.position.z = o.z;
    if (o.z > OBSTACLE_END_Z) o.mesh.visible = false;
  }

  // Collision — hits raise chase danger (boost still clears through)
  ctx.playerBox.setFromCenterAndSize(
    new THREE.Vector3(ctx.cup.position.x, ctx.cup.position.y + 0.55, ctx.cup.position.z),
    new THREE.Vector3(0.62, 1.0, 0.62),
  );
  for (const o of state.obstacles) {
    if (!o.mesh.visible) continue;
    if (!blocksPlayerLane(o.lane, p.lane, !!o.wide)) continue;
    const kindKey = typeof o.kind === 'string' ? o.kind : 'chair';
    const meta = isObstacleKind(kindKey) ? OBSTACLE_KINDS[kindKey] : null;
    const clearH = meta?.jumpHeight ?? 0.5;
    // Jump clear before box test
    if (p.y > clearH) continue;
    const hitW = meta?.hitW ?? 1.0;
    const hitD = meta?.hitD ?? 0.8;
    const hitH = Math.max(0.25, clearH * 1.1);
    const cx = o.wide
      ? (() => {
          const a = o.lane === 0 ? 0 : o.lane === 2 ? 1 : o.lane;
          const b = o.lane === 0 ? 1 : o.lane === 2 ? 2 : Math.min(2, o.lane + 1);
          return ((LANE_X[a] ?? 0) + (LANE_X[b] ?? 0)) / 2;
        })()
      : (LANE_X[o.lane] ?? 0);
    ctx.obBox.setFromCenterAndSize(
      new THREE.Vector3(cx, hitH * 0.5, o.z),
      new THREE.Vector3(hitW, hitH, hitD),
    );
    if (ctx.playerBox.intersectsBox(ctx.obBox)) {
      if (state.boost.active) {
        state.score += 1;
        state.flash = 0.15;
        o.lane = -1;
        o.mesh.visible = false;
        continue;
      }
      // Soft hit: bump chase danger, knock obstacle away, keep running
      const hit = applyChaseHit(state.chase);
      if (hit) {
        state.chase = hit;
        state.shake = Math.max(state.shake, 0.28);
        state.flash = Math.max(state.flash, 0.18);
      }
      o.lane = -1;
      o.mesh.visible = false;
      if (isCaught(state.chase)) {
        state.failReason = 'caught';
        state.shake = 0.45;
        state.flash = 0.25;
        state.gameOver = true;
        ctx.onCrash();
        return false;
      }
    }
  }

  // Caught by passive creep / meter max (no obstacle this frame)
  if (isCaught(state.chase)) {
    state.failReason = 'caught';
    state.shake = 0.4;
    state.flash = 0.22;
    state.gameOver = true;
    ctx.onCrash();
    return false;
  }

  // World scroll — use active section textures from env handle
  const floorTex = ctx.env.floorTex;
  const wallTex = ctx.env.wallTex;
  const ceilingTex = ctx.env.ceilingTex;
  floorTex.offset.y = (state.worldTime * state.speed) / 4;
  if (wallTex) wallTex.offset.x = (state.worldTime * state.speed) / 6;
  ceilingTex.offset.y = (state.worldTime * state.speed) / 6;
  if (ctx.env.pathTex) {
    ctx.env.pathTex.offset.y = (state.worldTime * state.speed) / 5;
  }
  const decorRing = Math.max(
    1,
    ctx.env.decorItems.length * ctx.env.DECOR_SPACING,
  );
  for (const d of ctx.env.decorItems) {
    d.position.z += state.speed * dt;
    if (d.position.z > 8) {
      d.position.z -= decorRing;
    }
  }

  // Camera
  const bobAmp = state.boost.active ? 0.1 : 0.035;
  const bobFreq = state.boost.active ? 14 : 9;
  const camBob = Math.sin(state.worldTime * bobFreq) * bobAmp;
  ctx.camera.position.x +=
    (p.laneX * 0.45 - ctx.camera.position.x) * Math.min(1, dt * 8);
  ctx.camera.position.y = ctx.cameraBaseY + p.y * 0.4 + camBob;
  ctx.camera.position.z = ctx.cameraBaseZ;
  ctx.tmpVec.set(p.laneX * 0.2, 1.0 + p.y * 0.2 + camBob, -8);
  ctx.camera.lookAt(ctx.tmpVec);
  const targetFov = state.boost.active ? 78 : 70;
  ctx.camera.fov += (targetFov - ctx.camera.fov) * Math.min(1, dt * 4);
  ctx.camera.updateProjectionMatrix();
  if (state.shake > 0) {
    ctx.camera.position.x += (Math.random() - 0.5) * state.shake;
    ctx.camera.position.y += (Math.random() - 0.5) * state.shake;
  }
  state.shake = Math.max(0, state.shake - dt * 2.2);
  state.flash = Math.max(0, state.flash - dt * 3);

  // Shadow + boost glow
  const shadowScale = Math.max(0.4, 1 - p.y * 0.4);
  ctx.contactShadow.scale.set(shadowScale, shadowScale, 1);
  (ctx.contactShadow.material as THREE.MeshBasicMaterial).opacity = 0.42 * shadowScale;
  ctx.contactShadow.position.x = p.laneX;
  ctx.contactShadow.position.z = 0;
  ctx.boostGlow.position.set(p.laneX, 0.5 + p.y, 0);
  const glowTarget = state.boost.active
    ? 0.28 + 0.07 * Math.sin(state.worldTime * 8)
    : 0;
  const bgMat = ctx.boostGlow.material as THREE.MeshBasicMaterial;
  bgMat.opacity += (glowTarget - bgMat.opacity) * Math.min(1, dt * 6);
  if (state.boost.active) {
    ctx.scene.fog!.color.lerp(new THREE.Color(0x9ed5ff), Math.min(1, dt * 3));
  } else {
    ctx.scene.fog!.color.lerp(new THREE.Color(0xffd9a8), Math.min(1, dt * 3));
  }

  // Beans
  state.nextBean -= dt;
  if (state.nextBean <= 0) {
    ctx.spawnBean();
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
    if (beanRecyclePastCamera(b.z)) {
      b.active = false;
      b.mesh.visible = false;
      continue;
    }
    if (
      canCollectBean({
        beanLane: b.lane,
        beanZ: b.z,
        playerLane: p.lane,
        playerY: p.y,
      })
    ) {
      // Caffeine buys distance from the man
      state.chase = applyChaseBeanRelief(state.chase);
      ctx.collectBean(b);
    }
  }

  // Motes / particles
  for (const m of state.motes) {
    m.position.y += Math.sin(state.worldTime * 0.7 + m.userData.phase) * 0.002;
    m.position.z += state.speed * dt * 0.6;
    if (m.position.z > 8) {
      m.position.z = -80 - Math.random() * 10;
      m.position.x = (Math.random() - 0.5) * 6;
    }
  }
  if (state.boost.active) {
    state.nextBoostParticle -= dt;
    if (state.nextBoostParticle <= 0) {
      ctx.emitBoostParticle();
      state.nextBoostParticle = 0.04;
    }
  }
  for (const bp of state.boostParticles) {
    if (bp.life <= 0) continue;
    bp.life -= dt;
    bp.mesh.position.y += (bp.vy || 0) * dt;
    bp.mesh.position.z += state.speed * dt * 0.3;
    const mat = bp.mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, (bp.life / bp.maxLife) * 0.8);
    bp.mesh.scale.setScalar(0.5 + (1 - bp.life / bp.maxLife) * 0.6);
    if (bp.life <= 0) bp.mesh.visible = false;
  }
  for (const d of ctx.dustPool) {
    if (d.life <= 0) continue;
    d.life -= dt;
    d.vy -= 5 * dt;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.z += d.vz * dt;
    d.mesh.position.set(d.x, d.y, d.z);
    const mat = d.mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, d.life / d.maxLife);
    d.mesh.scale.setScalar(0.5 + (1 - d.life / d.maxLife) * 0.6);
    if (d.life <= 0) d.mesh.visible = false;
  }

  // Boost meter
  {
    const b = tickBoost(
      {
        active: state.boost.active,
        timer: state.boost.timer,
        meter: state.boost.meter,
        max: state.boost.max,
        cost: state.boost.cost,
        duration: state.boost.duration,
      },
      dt,
    );
    state.boost.active = b.active;
    state.boost.timer = b.timer;
    state.boost.meter = b.meter;
  }

  // Chase / danger meter HUD
  const dangerPct = chaseProximity(state.chase) * 100;
  if (ctx.chaseFill) {
    ctx.chaseFill.style.width = `${dangerPct.toFixed(1)}%`;
  }
  if (ctx.chaseHud) {
    ctx.chaseHud.classList.toggle('is-hot', dangerPct >= 70);
    ctx.chaseHud.classList.toggle('is-mid', dangerPct >= 40 && dangerPct < 70);
  }

  if (ctx.boostFill) {
    ctx.boostFill.style.height = `${(state.boost.meter / state.boost.max) * 100}%`;
  }
  if (ctx.boostHudFill) {
    ctx.boostHudFill.style.width = `${(state.boost.meter / state.boost.max) * 100}%`;
  }
  if (ctx.boostBtn) {
    ctx.boostBtn.classList.toggle('is-active', state.boost.active);
  }
  if (ctx.scoreEl) ctx.scoreEl.textContent = String(state.score);

  return true;
}
