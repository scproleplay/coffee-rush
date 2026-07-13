/**
 * Per-frame simulation + presentation side-effects (CE-local).
 * Pure rules stay in other systems; this mutates meshes/state for the loop.
 */
import * as THREE from 'three';
import {
  BEAN_INTERVAL_MAX,
  BEAN_INTERVAL_MIN,
  JUMP_VY,
  LANE_X,
  OBSTACLE_END_Z,
} from '../engine/constants';
import type { GameState } from '../engine/types';
import {
  beanRecyclePastCamera,
  blocksPlayerLane,
  canCollectBean,
} from './collisionLogic';
import { nextBeanDelay, scoreFromTime, speedAtTime, tickBoost } from './pacingLogic';
import {
  cupTiltX,
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
  manArmL: THREE.Mesh;
  manArmR: THREE.Mesh;
  manLegL: THREE.Mesh;
  manLegR: THREE.Mesh;
  // world
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  cameraBaseY: number;
  cameraBaseZ: number;
  floorTex: THREE.CanvasTexture;
  wallTex: THREE.CanvasTexture;
  ceilingTex: THREE.CanvasTexture;
  decorItems: THREE.Object3D[];
  DECOR_SPACING: number;
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
  // DOM
  scoreEl: HTMLElement | null;
  boostFill: HTMLElement | null;
  boostHudFill: HTMLElement | null;
  boostBtn: HTMLElement | null;
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

  const p = state.player;
  Object.assign(p, tickLaneMotion(p, dt, LANE_X));
  const jumped = tickJump(
    { y: p.y, vy: p.vy, onGround: p.onGround, airT: p.airT || 0 },
    dt,
  );
  p.y = jumped.y;
  p.vy = jumped.vy;
  p.onGround = jumped.onGround;
  p.airT = jumped.airT;
  p.runAnim = tickRunAnim(p.runAnim, dt, state.speed);

  // Cup pose
  ctx.cup.position.x = p.laneX;
  ctx.cup.position.y = p.y;
  const swing = Math.sin(p.runAnim) * 1.0;
  const bob = p.onGround ? Math.abs(Math.sin(p.runAnim * 2)) * 0.06 : 0;
  ctx.armLGroup.rotation.x = swing;
  ctx.armRGroup.rotation.x = -swing;
  ctx.legLGroup.rotation.x = -swing * 0.7;
  ctx.legRGroup.rotation.x = swing * 0.7;
  if (!p.onGround) {
    const tuck = Math.min(1, p.vy / JUMP_VY + 0.4);
    ctx.legLGroup.rotation.x = -1.0 * tuck - 0.3;
    ctx.legRGroup.rotation.x = -1.0 * tuck - 0.3;
    ctx.armLGroup.rotation.x = -1.5 * tuck - 0.2;
    ctx.armRGroup.rotation.x = 1.5 * tuck + 0.2;
  }
  ctx.cup.rotation.x = cupTiltX(p.onGround, p.airT || 0);
  ctx.cup.rotation.z = laneBank(p.laneSwitchT, p.laneFromX, p.laneToX);
  ctx.cup.position.y = p.y + bob;

  for (const child of ctx.steamGroup.children) {
    const ph = child.userData.phase || 0;
    const t = state.worldTime * 2 + ph;
    child.position.y = ((t * 0.4) % 0.6) + 0.05;
    child.position.x = (ph - 1) * 0.08 + Math.sin(t * 1.5) * 0.02;
    const k = 1 - (((t * 0.4) % 0.6) / 0.6);
    child.scale.setScalar(0.4 + k * 0.9);
  }

  const manSwing = Math.sin(p.runAnim * 0.9) * 0.7;
  ctx.manArmL.rotation.x = -manSwing;
  ctx.manArmR.rotation.x = manSwing;
  ctx.manLegL.rotation.x = manSwing;
  ctx.manLegR.rotation.x = -manSwing;
  ctx.man.position.y = Math.abs(Math.sin(p.runAnim * 1.8)) * 0.05;

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

  // Collision
  ctx.playerBox.setFromCenterAndSize(
    new THREE.Vector3(ctx.cup.position.x, ctx.cup.position.y + 0.55, ctx.cup.position.z),
    new THREE.Vector3(0.7, 1.1, 0.7),
  );
  for (const o of state.obstacles) {
    if (!o.mesh.visible) continue;
    if (!blocksPlayerLane(o.lane, p.lane, !!o.wide)) continue;
    ctx.obBox.setFromObject(o.mesh);
    if (ctx.playerBox.intersectsBox(ctx.obBox)) {
      if (state.boost.active) {
        state.score += 1;
        state.flash = 0.15;
        o.lane = -1;
        continue;
      }
      state.shake = 0.45;
      state.flash = 0.25;
      state.gameOver = true;
      ctx.onCrash();
      return false;
    }
  }

  // World scroll
  ctx.floorTex.offset.y = (state.worldTime * state.speed) / 4;
  ctx.wallTex.offset.x = (state.worldTime * state.speed) / 6;
  ctx.ceilingTex.offset.y = (state.worldTime * state.speed) / 6;
  for (const d of ctx.decorItems) {
    d.position.z += state.speed * dt;
    if (d.position.z > 8) {
      d.position.z -= ctx.decorItems.length * ctx.DECOR_SPACING;
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
