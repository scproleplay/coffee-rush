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

/** Window recess on the side wall (visual only). */
export function makeWindow(side: 'left' | 'right') {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.2, 1.0),
    new THREE.MeshLambertMaterial({ color: 0xf0e0c0 }),
  );
  frame.position.y = 2.2;
  group.add(frame);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 1.0),
    new THREE.MeshLambertMaterial({
      color: 0xa8d0e8,
      emissive: 0xffe0a0,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.85,
    }),
  );
  glass.position.set(side === 'left' ? 0.05 : -0.05, 2.2, 0);
  if (side === 'right') glass.rotation.y = Math.PI;
  group.add(glass);
  const mullion = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 1.0, 0.04),
    new THREE.MeshLambertMaterial({ color: 0xe8d8b8 }),
  );
  mullion.position.set(side === 'left' ? 0.06 : -0.06, 2.2, 0);
  group.add(mullion);
  const sill = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.08, 1.1),
    new THREE.MeshLambertMaterial({ color: 0xe8d8b0 }),
  );
  sill.position.set(side === 'left' ? 0.08 : -0.08, 1.55, 0);
  group.add(sill);
  return group;
}

/** Wall shelf with small props. */
export function makeShelf() {
  const group = new THREE.Group();
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.06, 1.1),
    new THREE.MeshLambertMaterial({ color: 0x8a5a30 }),
  );
  board.position.y = 2.0;
  group.add(board);
  const bracketL = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.2, 0.08),
    new THREE.MeshLambertMaterial({ color: 0x5a3a14 }),
  );
  bracketL.position.set(0, 1.88, -0.4);
  group.add(bracketL);
  const bracketR = bracketL.clone();
  bracketR.position.z = 0.4;
  group.add(bracketR);
  const jar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.18, 8),
    new THREE.MeshLambertMaterial({ color: 0xe8c070 }),
  );
  jar.position.set(0.02, 2.15, -0.2);
  group.add(jar);
  const book = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.2, 0.16),
    new THREE.MeshLambertMaterial({ color: 0x4060a0 }),
  );
  book.position.set(0.02, 2.16, 0.25);
  group.add(book);
  return group;
}

/** Kitchen counter strip against the wall. */
export function makeKitchenCounter() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.85, 1.4),
    new THREE.MeshLambertMaterial({ color: 0xc4a06a }),
  );
  body.position.y = 0.42;
  group.add(body);
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(0.78, 0.06, 1.5),
    new THREE.MeshLambertMaterial({ color: 0xe8e0d0 }),
  );
  top.position.y = 0.88;
  group.add(top);
  const sink = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.14, 0.08, 12),
    new THREE.MeshLambertMaterial({ color: 0xb0b8c0 }),
  );
  sink.position.set(0.05, 0.92, 0.2);
  group.add(sink);
  const faucet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6),
    new THREE.MeshLambertMaterial({ color: 0xa8a8a8 }),
  );
  faucet.position.set(0.05, 1.1, 0.05);
  group.add(faucet);
  return group;
}

/** Tall fridge — unmistakable kitchen silhouette. */
export function makeFridge() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 1.9, 0.7),
    new THREE.MeshLambertMaterial({ color: 0xe8eef2 }),
  );
  body.position.y = 0.95;
  group.add(body);
  // Freezer seam
  const seam = new THREE.Mesh(
    new THREE.BoxGeometry(0.86, 0.03, 0.02),
    new THREE.MeshLambertMaterial({ color: 0xb0b8c0 }),
  );
  seam.position.set(0, 1.45, 0.36);
  group.add(seam);
  // Handles
  const handleMat = new THREE.MeshLambertMaterial({ color: 0x8a9098 });
  const h1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.04), handleMat);
  h1.position.set(0.3, 1.65, 0.38);
  group.add(h1);
  const h2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 0.04), handleMat);
  h2.position.set(0.3, 0.85, 0.38);
  group.add(h2);
  // Toe kick
  const kick = new THREE.Mesh(
    new THREE.BoxGeometry(0.88, 0.08, 0.72),
    new THREE.MeshLambertMaterial({ color: 0x2a2a2a }),
  );
  kick.position.y = 0.04;
  group.add(kick);
  return group;
}

/** Stove / range with cooktop — kitchen identity. */
export function makeStove() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.85, 0.7),
    new THREE.MeshLambertMaterial({ color: 0x3a3a40 }),
  );
  body.position.y = 0.42;
  group.add(body);
  const cooktop = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.05, 0.74),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1e }),
  );
  cooktop.position.y = 0.88;
  group.add(cooktop);
  // Burners
  const burnerMat = new THREE.MeshLambertMaterial({ color: 0x2a2a30 });
  for (const [x, z] of [
    [-0.22, 0.15],
    [0.22, 0.15],
    [-0.22, -0.15],
    [0.22, -0.15],
  ] as const) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 10), burnerMat);
    b.position.set(x, 0.92, z);
    group.add(b);
  }
  // Oven window
  const window = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.35, 0.02),
    new THREE.MeshLambertMaterial({
      color: 0x1a2030,
      emissive: 0xff6020,
      emissiveIntensity: 0.15,
    }),
  );
  window.position.set(0, 0.4, 0.36);
  group.add(window);
  // Backsplash riser
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.55, 0.08),
    new THREE.MeshLambertMaterial({ color: 0x2a2a30 }),
  );
  back.position.set(0, 1.15, -0.28);
  group.add(back);
  return group;
}

/** Dining table + chairs silhouette for kitchen/dining feel. */
export function makeDiningSet() {
  const group = new THREE.Group();
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.06, 0.7),
    new THREE.MeshLambertMaterial({ color: 0xa07040 }),
  );
  top.position.y = 0.78;
  group.add(top);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x5a3a14 });
  for (const [x, z] of [
    [-0.35, 0.25],
    [0.35, 0.25],
    [-0.35, -0.25],
    [0.35, -0.25],
  ] as const) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 6), legMat);
    leg.position.set(x, 0.38, z);
    group.add(leg);
  }
  // One chair tucked in (readable)
  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.06, 0.35),
    new THREE.MeshLambertMaterial({ color: 0x8a5a28 }),
  );
  seat.position.set(0, 0.45, 0.55);
  group.add(seat);
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.45, 0.06),
    new THREE.MeshLambertMaterial({ color: 0x7a4a20 }),
  );
  back.position.set(0, 0.7, 0.7);
  group.add(back);
  // Bowl on table
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xd06040 }),
  );
  bowl.scale.set(1, 0.5, 1);
  bowl.position.set(0, 0.88, 0);
  group.add(bowl);
  return group;
}

/** Living-room couch edge — large and readable. */
export function makeCouch() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.4, 1.5),
    new THREE.MeshLambertMaterial({ color: 0x6a5a8a }),
  );
  base.position.y = 0.32;
  group.add(base);
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.55, 1.5),
    new THREE.MeshLambertMaterial({ color: 0x5a4a7a }),
  );
  back.position.set(-0.3, 0.65, 0);
  group.add(back);
  const arm1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.3, 0.18),
    new THREE.MeshLambertMaterial({ color: 0x5a4a7a }),
  );
  arm1.position.set(0, 0.55, 0.7);
  group.add(arm1);
  const arm2 = arm1.clone();
  arm2.position.z = -0.7;
  group.add(arm2);
  // Pillows
  const p1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.22, 0.28),
    new THREE.MeshLambertMaterial({ color: 0xd08070 }),
  );
  p1.position.set(0.1, 0.62, 0.25);
  group.add(p1);
  const p2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.2, 0.26),
    new THREE.MeshLambertMaterial({ color: 0xe8d0a0 }),
  );
  p2.position.set(0.05, 0.6, -0.3);
  group.add(p2);
  return group;
}

/** TV stand with screen — living room identity. */
export function makeTvStand() {
  const group = new THREE.Group();
  const stand = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.55, 1.2),
    new THREE.MeshLambertMaterial({ color: 0x4a3020 }),
  );
  stand.position.y = 0.28;
  group.add(stand);
  // Screen
  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.7, 1.05),
    new THREE.MeshLambertMaterial({
      color: 0x1a2030,
      emissive: 0x204060,
      emissiveIntensity: 0.35,
    }),
  );
  screen.position.set(0.05, 1.05, 0);
  group.add(screen);
  // Bezel
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.78, 1.15),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
  );
  bezel.position.set(0.02, 1.05, 0);
  group.add(bezel);
  // Speaker / console box
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.12, 0.35),
    new THREE.MeshLambertMaterial({ color: 0x2a2a2a }),
  );
  box.position.set(0.1, 0.62, 0.25);
  group.add(box);
  return group;
}

/** Floor lamp for living room warmth. */
export function makeFloorLamp() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 0.06, 10),
    new THREE.MeshLambertMaterial({ color: 0x4a3020 }),
  );
  base.position.y = 0.03;
  group.add(base);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6),
    new THREE.MeshLambertMaterial({ color: 0x5a4030 }),
  );
  pole.position.y = 0.85;
  group.add(pole);
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.28, 0.35, 10),
    new THREE.MeshLambertMaterial({
      color: 0xffe8c0,
      emissive: 0xffaa60,
      emissiveIntensity: 0.5,
    }),
  );
  shade.position.y = 1.75;
  group.add(shade);
  return group;
}

/** Laundry basket — hallway clutter. */
export function makeLaundryBasket() {
  const group = new THREE.Group();
  const basket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.28, 0.55, 10, 1, true),
    new THREE.MeshLambertMaterial({
      color: 0xd4a574,
      side: THREE.DoubleSide,
    }),
  );
  basket.position.y = 0.28;
  group.add(basket);
  const bottom = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 10),
    new THREE.MeshLambertMaterial({ color: 0xc09060 }),
  );
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = 0.02;
  group.add(bottom);
  // Clothes pile
  const clothColors = [0x6080c0, 0xc06060, 0xe8e0d0];
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 6),
      new THREE.MeshLambertMaterial({ color: clothColors[i]! }),
    );
    c.scale.set(1.2, 0.5, 1);
    c.position.set((i - 1) * 0.08, 0.52 + i * 0.04, (i % 2) * 0.05);
    group.add(c);
  }
  return group;
}

/** Bed edge + nightstand — bedroom section identity. */
export function makeBedEdge() {
  const group = new THREE.Group();
  // Mattress / bed body along wall
  const mattress = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.35, 1.6),
    new THREE.MeshLambertMaterial({ color: 0xe8e0f0 }),
  );
  mattress.position.y = 0.4;
  group.add(mattress);
  // Frame
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.2, 1.65),
    new THREE.MeshLambertMaterial({ color: 0x6b4220 }),
  );
  frame.position.y = 0.15;
  group.add(frame);
  // Headboard
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.7, 1.65),
    new THREE.MeshLambertMaterial({ color: 0x5a3520 }),
  );
  head.position.set(-0.4, 0.7, 0);
  group.add(head);
  // Pillow
  const pillow = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.12, 0.55),
    new THREE.MeshLambertMaterial({ color: 0xfff8f0 }),
  );
  pillow.position.set(-0.15, 0.65, 0.35);
  group.add(pillow);
  // Blanket fold
  const blanket = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.08, 1.0),
    new THREE.MeshLambertMaterial({ color: 0x5a7a9a }),
  );
  blanket.position.set(0.1, 0.6, -0.15);
  group.add(blanket);
  return group;
}

/** Nightstand with lamp — pairs with bed. */
export function makeNightstand() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.55, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x8a5a30 }),
  );
  body.position.y = 0.28;
  group.add(body);
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.05, 0.44),
    new THREE.MeshLambertMaterial({ color: 0xa07040 }),
  );
  top.position.y = 0.58;
  group.add(top);
  // Drawer line
  const drawer = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.12, 0.02),
    new THREE.MeshLambertMaterial({ color: 0x6a4020 }),
  );
  drawer.position.set(0, 0.35, 0.21);
  group.add(drawer);
  // Lamp
  const lampBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.08, 8),
    new THREE.MeshLambertMaterial({ color: 0xd4b48a }),
  );
  lampBase.position.set(0, 0.66, 0);
  group.add(lampBase);
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6),
    new THREE.MeshLambertMaterial({ color: 0x8a8a8a }),
  );
  stem.position.set(0, 0.8, 0);
  group.add(stem);
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.14, 0.16, 8),
    new THREE.MeshLambertMaterial({
      color: 0xfff0d0,
      emissive: 0xffcc88,
      emissiveIntensity: 0.4,
    }),
  );
  shade.position.set(0, 0.95, 0);
  group.add(shade);
  // Clock
  const clock = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.08, 0.06),
    new THREE.MeshLambertMaterial({ color: 0x2a2a2a }),
  );
  clock.position.set(0.12, 0.66, 0.1);
  group.add(clock);
  return group;
}

/** Tall bookshelf for living/hallway density. */
export function makeBookshelf() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 1.7, 0.9),
    new THREE.MeshLambertMaterial({ color: 0x7a4a22 }),
  );
  body.position.y = 0.85;
  group.add(body);
  // Shelves
  const shelfMat = new THREE.MeshLambertMaterial({ color: 0x5a3010 });
  for (let i = 0; i < 4; i++) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.88), shelfMat);
    shelf.position.set(0, 0.25 + i * 0.4, 0);
    group.add(shelf);
  }
  // Books
  const colors = [0xc04040, 0x3a6a9a, 0xd4a020, 0x4a8a3a, 0x8a4a8a, 0xe07040];
  for (let row = 0; row < 4; row++) {
    for (let b = 0; b < 4; b++) {
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.28, 0.16),
        new THREE.MeshLambertMaterial({ color: colors[(row * 4 + b) % colors.length]! }),
      );
      book.position.set(0.08, 0.42 + row * 0.4, -0.3 + b * 0.2);
      group.add(book);
    }
  }
  return group;
}

/** Room divider arch / doorway portal — signals room transitions. */
export function makeRoomArch(side: 'left' | 'right') {
  const group = new THREE.Group();
  const postMat = new THREE.MeshLambertMaterial({ color: 0x8a5a30 });
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.8, 0.25), postMat);
  post.position.set(side === 'left' ? 0.05 : -0.05, 1.4, 0);
  group.add(post);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 1.2), postMat);
  lintel.position.set(side === 'left' ? 0.05 : -0.05, 2.7, 0.4);
  group.add(lintel);
  // Soft wall accent panel behind arch (room color hint)
  const accent = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 2.6, 0.9),
    new THREE.MeshLambertMaterial({ color: 0xd4a070 }),
  );
  accent.position.set(side === 'left' ? -0.02 : 0.02, 1.3, 0.35);
  group.add(accent);
  return group;
}

/** Living-room coffee table (side decor, not a lane blocker). */
export function makeCoffeeTable() {
  const group = new THREE.Group();
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.06, 0.55),
    new THREE.MeshLambertMaterial({ color: 0x8a5a30 }),
  );
  top.position.y = 0.38;
  group.add(top);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x5a3a18 });
  for (const [x, z] of [
    [-0.35, -0.2],
    [0.35, -0.2],
    [-0.35, 0.2],
    [0.35, 0.2],
  ] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.36, 0.06), legMat);
    leg.position.set(x, 0.18, z);
    group.add(leg);
  }
  // Book + mug clutter
  const book = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.04, 0.16),
    new THREE.MeshLambertMaterial({ color: 0xc04040 }),
  );
  book.position.set(-0.15, 0.43, 0.05);
  group.add(book);
  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8),
    new THREE.MeshLambertMaterial({ color: 0xf0e8d8 }),
  );
  mug.position.set(0.2, 0.45, -0.05);
  group.add(mug);
  return group;
}

/** Soft throw pillows stack (living clutter). */
export function makePillowStack() {
  const group = new THREE.Group();
  const colors = [0xd08090, 0xe8c070, 0x7090b0];
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.14, 0.38),
      new THREE.MeshLambertMaterial({ color: colors[i]! }),
    );
    p.position.set((i - 1) * 0.08, 0.1 + i * 0.12, (i % 2) * 0.05);
    p.rotation.y = (i - 1) * 0.2;
    group.add(p);
  }
  return group;
}

/** Garden fence panel (side of outdoor path). */
export function makeFencePanel() {
  const group = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: 0xa07840 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x6a4a22 });
  // Horizontal rails
  for (const y of [0.35, 0.75, 1.15]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.4), wood);
    rail.position.set(0, y, 0);
    group.add(rail);
  }
  // Vertical pickets
  for (let i = 0; i < 5; i++) {
    const picket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.35, 0.1), dark);
    picket.position.set(0, 0.7, -0.55 + i * 0.28);
    group.add(picket);
  }
  return group;
}

/** Flower pot with simple plant. */
export function makeFlowerPot() {
  const group = new THREE.Group();
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.14, 0.28, 10),
    new THREE.MeshLambertMaterial({ color: 0xb85a3a }),
  );
  pot.position.y = 0.14;
  group.add(pot);
  const dirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.04, 10),
    new THREE.MeshLambertMaterial({ color: 0x3a2818 }),
  );
  dirt.position.y = 0.28;
  group.add(dirt);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3a8a40 });
  for (let i = 0; i < 4; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), leafMat);
    const a = (i / 4) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.08, 0.42, Math.sin(a) * 0.08);
    leaf.scale.set(1, 0.7, 1);
    group.add(leaf);
  }
  const bloom = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xe05070 }),
  );
  bloom.position.y = 0.52;
  group.add(bloom);
  return group;
}

/** Garden hose reel. */
export function makeHoseReel() {
  const group = new THREE.Group();
  const stand = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.55, 0.12),
    new THREE.MeshLambertMaterial({ color: 0x5a5a5a }),
  );
  stand.position.y = 0.28;
  group.add(stand);
  const reel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.22, 12),
    new THREE.MeshLambertMaterial({ color: 0x2a6aaa }),
  );
  reel.rotation.z = Math.PI / 2;
  reel.position.set(0, 0.45, 0);
  group.add(reel);
  const hose = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.04, 6, 14),
    new THREE.MeshLambertMaterial({ color: 0x1a5a9a }),
  );
  hose.rotation.y = Math.PI / 2;
  hose.position.set(0, 0.45, 0);
  group.add(hose);
  return group;
}

/** Patio chair (garden seating). */
export function makePatioChair() {
  const group = new THREE.Group();
  const frame = new THREE.MeshLambertMaterial({ color: 0xc0b090 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.5), frame);
  seat.position.y = 0.42;
  group.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.06), frame);
  back.position.set(0, 0.72, -0.22);
  group.add(back);
  for (const x of [-0.22, 0.22]) {
    for (const z of [-0.2, 0.2]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6),
        frame,
      );
      leg.position.set(x, 0.2, z);
      group.add(leg);
    }
  }
  // Soft cushion
  const cushion = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.05, 0.42),
    new THREE.MeshLambertMaterial({ color: 0x5a9a70 }),
  );
  cushion.position.y = 0.48;
  group.add(cushion);
  return group;
}

/** Bush / shrub for garden sides. */
export function makeBush() {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x3a7a38 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x2a5a28 });
  const a = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), mat);
  a.position.y = 0.4;
  a.scale.set(1.1, 0.85, 1);
  group.add(a);
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), dark);
  b.position.set(0.25, 0.35, 0.1);
  group.add(b);
  const c = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), mat);
  c.position.set(-0.22, 0.38, -0.08);
  group.add(c);
  return group;
}

/** Garden gate post (transition marker). */
export function makeGardenGate(side: 'left' | 'right') {
  const group = new THREE.Group();
  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 1.8, 0.18),
    new THREE.MeshLambertMaterial({ color: 0x7a5a30 }),
  );
  post.position.set(side === 'left' ? 0.05 : -0.05, 0.9, 0);
  group.add(post);
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.1, 0.24),
    new THREE.MeshLambertMaterial({ color: 0x5a3a18 }),
  );
  cap.position.set(side === 'left' ? 0.05 : -0.05, 1.85, 0);
  group.add(cap);
  // Small hanging lantern
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 6),
    new THREE.MeshLambertMaterial({
      color: 0xffe8a0,
      emissive: 0xffaa40,
      emissiveIntensity: 0.4,
    }),
  );
  lamp.position.set(side === 'left' ? 0.2 : -0.2, 1.5, 0);
  group.add(lamp);
  return group;
}
