import * as THREE from 'three';
import { makePictureTexture } from '../engine/textures';

/** House interior side decorations (CE-local). */

export function makePictureFrame(variant: number, side: 'left' | 'right') {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.72, 0.92),
    new THREE.MeshLambertMaterial({ color: 0x6b3f1a }),
  );
  group.add(frame);
  // Inner mat
  const mat = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.58, 0.76),
    new THREE.MeshLambertMaterial({ color: 0xf5e6c8 }),
  );
  mat.position.x = side === 'left' ? 0.01 : -0.01;
  group.add(mat);
  const pic = new THREE.Mesh(
    new THREE.PlaneGeometry(0.68, 0.5),
    new THREE.MeshBasicMaterial({ map: makePictureTexture(variant) }),
  );
  if (side === 'left') {
    pic.position.set(0.025, 0.02, 0);
  } else {
    pic.position.set(-0.025, 0.02, 0);
    pic.rotation.y = Math.PI;
  }
  group.add(pic);
  return group;
}

export function makeWallLamp() {
  const group = new THREE.Group();
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.18, 0.18),
    new THREE.MeshLambertMaterial({ color: 0x8a6a3a }),
  );
  group.add(plate);
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.04, 0.04),
    new THREE.MeshLambertMaterial({ color: 0x5a3a14 }),
  );
  arm.position.x = 0.12;
  group.add(arm);
  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 0.18, 8),
    new THREE.MeshLambertMaterial({
      color: 0xffe8b8,
      emissive: 0xffaa55,
      emissiveIntensity: 0.55,
    }),
  );
  shade.position.set(0.22, -0.1, 0);
  shade.rotation.x = Math.PI;
  group.add(shade);
  return group;
}

export function makePlant() {
  const group = new THREE.Group();
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.13, 0.24, 10),
    new THREE.MeshLambertMaterial({ color: 0xc47848 }),
  );
  pot.position.y = 0.12;
  group.add(pot);
  for (let i = 0; i < 4; i++) {
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.07, 0.36, 6),
      new THREE.MeshLambertMaterial({ color: i % 2 === 0 ? 0x4a8a3a : 0x3d7a32 }),
    );
    leaf.position.set((i - 1.5) * 0.07, 0.4, (i % 2) * 0.04);
    leaf.rotation.z = (i - 1.5) * 0.28;
    group.add(leaf);
  }
  return group;
}

export function makeSideTable() {
  const group = new THREE.Group();
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.05, 0.36),
    new THREE.MeshLambertMaterial({ color: 0x9a5a28 }),
  );
  top.position.y = 0.72;
  group.add(top);
  const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x5a3a14 });
  for (const [x, z] of [
    [-0.18, 0.12],
    [0.18, 0.12],
    [-0.18, -0.12],
    [0.18, -0.12],
  ] as const) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(x, 0.35, z);
    group.add(leg);
  }
  const lampBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.06, 10),
    new THREE.MeshLambertMaterial({ color: 0xd4b48a }),
  );
  lampBase.position.set(-0.08, 0.78, 0);
  group.add(lampBase);
  const lampShade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.14, 0.16, 10),
    new THREE.MeshLambertMaterial({
      color: 0xfff0d0,
      emissive: 0xffcc88,
      emissiveIntensity: 0.35,
    }),
  );
  lampShade.position.set(-0.08, 0.92, 0);
  group.add(lampShade);
  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.09, 10),
    new THREE.MeshLambertMaterial({ color: 0xf5f0e8 }),
  );
  mug.position.set(0.12, 0.8, 0.04);
  group.add(mug);
  return group;
}

/** Interior door flush to the side wall — visual only, not an obstacle. */
export function makeDoor(side: 'left' | 'right') {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 2.4, 1.1),
    new THREE.MeshLambertMaterial({ color: 0x6b4220 }),
  );
  frame.position.y = 1.2;
  group.add(frame);
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 2.2, 0.95),
    new THREE.MeshLambertMaterial({ color: 0x8b5a2b }),
  );
  panel.position.set(side === 'left' ? 0.04 : -0.04, 1.15, 0);
  group.add(panel);
  // Raised panels
  const insetMat = new THREE.MeshLambertMaterial({ color: 0x7a4a22 });
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.7, 0.55), insetMat);
  upper.position.set(side === 'left' ? 0.07 : -0.07, 1.55, 0);
  group.add(upper);
  const lower = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.7, 0.55), insetMat);
  lower.position.set(side === 'left' ? 0.07 : -0.07, 0.7, 0);
  group.add(lower);
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xd4af37 }),
  );
  knob.position.set(side === 'left' ? 0.1 : -0.1, 1.05, 0.35);
  group.add(knob);
  return group;
}

/** Soft area rug along the side of the hallway. */
export function makeRug() {
  const group = new THREE.Group();
  const rug = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.02, 1.6),
    new THREE.MeshLambertMaterial({ color: 0xb85a3a }),
  );
  rug.position.y = 0.012;
  group.add(rug);
  const border = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.015, 1.65),
    new THREE.MeshLambertMaterial({ color: 0xe8d5a8 }),
  );
  border.position.y = 0.008;
  group.add(border);
  return group;
}

/** Low bookshelf / kitchen cabinet silhouette for side density. */
export function makeCabinet() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.9, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x8a5a30 }),
  );
  body.position.y = 0.45;
  group.add(body);
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.05, 0.44),
    new THREE.MeshLambertMaterial({ color: 0xc4a06a }),
  );
  top.position.y = 0.92;
  group.add(top);
  // Door seam
  const seam = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.7, 0.01),
    new THREE.MeshLambertMaterial({ color: 0x5a3a14 }),
  );
  seam.position.set(0, 0.45, 0.21);
  group.add(seam);
  // Books on top
  const colors = [0xc04040, 0x3a6a9a, 0xd4a020];
  for (let i = 0; i < 3; i++) {
    const book = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.16, 0.12),
      new THREE.MeshLambertMaterial({ color: colors[i]! }),
    );
    book.position.set(-0.12 + i * 0.12, 1.02, 0);
    group.add(book);
  }
  return group;
}

/** Soft armchair tucked against the wall (kitchen/living feel). */
export function makeArmchair() {
  const group = new THREE.Group();
  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.28, 0.55),
    new THREE.MeshLambertMaterial({ color: 0x6a7a4a }),
  );
  seat.position.y = 0.28;
  group.add(seat);
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.55, 0.12),
    new THREE.MeshLambertMaterial({ color: 0x5a6a3a }),
  );
  back.position.set(0, 0.6, -0.2);
  group.add(back);
  const armL = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.22, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x5a6a3a }),
  );
  armL.position.set(-0.35, 0.42, 0);
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.35;
  group.add(armR);
  // Legs
  const legMat = new THREE.MeshLambertMaterial({ color: 0x4a2a10 });
  for (const [x, z] of [
    [-0.28, 0.18],
    [0.28, 0.18],
    [-0.28, -0.18],
    [0.28, -0.18],
  ] as const) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 6), legMat);
    leg.position.set(x, 0.08, z);
    group.add(leg);
  }
  return group;
}
