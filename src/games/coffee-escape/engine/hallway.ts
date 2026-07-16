import * as THREE from 'three';
import {
  makeCeilingTexture,
  makeFloorTexture,
  makeWallTexture,
} from './textures';
import {
  makeArmchair,
  makeBedEdge,
  makeBookshelf,
  makeCabinet,
  makeCouch,
  makeDiningSet,
  makeDoor,
  makeFloorLamp,
  makeFridge,
  makeKitchenCounter,
  makeLaundryBasket,
  makeNightstand,
  makePictureFrame,
  makePlant,
  makeRoomArch,
  makeRug,
  makeShelf,
  makeSideTable,
  makeStove,
  makeTvStand,
  makeWallLamp,
  makeWindow,
} from '../entities/decor';

export interface HallwayBundle {
  floorTex: THREE.CanvasTexture;
  wallTex: THREE.CanvasTexture;
  ceilingTex: THREE.CanvasTexture;
  decorItems: THREE.Object3D[];
  DECOR_SPACING: number;
}

/**
 * Room themes cycle so the run clearly reads as a house chase:
 * kitchen → living room → hallway → bedroom → repeat.
 * Props stay OFF the three playable lanes (x≈±2.1..±2.95).
 */
type RoomTheme = 'kitchen' | 'living' | 'hallway' | 'bedroom';

const ROOM_CYCLE: RoomTheme[] = ['kitchen', 'living', 'hallway', 'bedroom'];

/** Items per themed section (both sides). */
const SECTION_LENGTH = 8;

function placeSide(
  item: THREE.Object3D,
  side: 'left' | 'right',
  x: number,
  y: number,
  faceInward = true,
): void {
  item.position.x = side === 'left' ? -x : x;
  item.position.y = y;
  if (faceInward) {
    // Face toward center lane
    item.rotation.y = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
  }
}

function makeKitchenProp(i: number, side: 'left' | 'right'): THREE.Object3D {
  const slot = i % 4;
  let item: THREE.Object3D;
  if (slot === 0) {
    item = makeFridge();
    item.scale.setScalar(1.15);
    placeSide(item, side, 2.35, 0);
  } else if (slot === 1) {
    item = makeStove();
    item.scale.setScalar(1.15);
    placeSide(item, side, 2.3, 0);
  } else if (slot === 2) {
    item = makeKitchenCounter();
    item.scale.setScalar(1.2);
    placeSide(item, side, 2.25, 0);
  } else {
    item = makeDiningSet();
    item.scale.setScalar(1.15);
    placeSide(item, side, 2.2, 0);
  }
  return item;
}

function makeLivingProp(i: number, side: 'left' | 'right'): THREE.Object3D {
  const slot = i % 5;
  let item: THREE.Object3D;
  if (slot === 0) {
    item = makeCouch();
    item.scale.setScalar(1.2);
    placeSide(item, side, 2.25, 0);
  } else if (slot === 1) {
    item = makeTvStand();
    item.scale.setScalar(1.15);
    placeSide(item, side, 2.3, 0);
  } else if (slot === 2) {
    item = makeFloorLamp();
    item.scale.setScalar(1.25);
    placeSide(item, side, 2.35, 0, false);
  } else if (slot === 3) {
    item = makeBookshelf();
    item.scale.setScalar(1.1);
    placeSide(item, side, 2.35, 0);
  } else {
    item = makeArmchair();
    item.scale.setScalar(1.3);
    placeSide(item, side, 2.2, 0);
  }
  return item;
}

function makeHallwayProp(i: number, side: 'left' | 'right'): THREE.Object3D {
  const slot = i % 6;
  let item: THREE.Object3D;
  if (slot === 0) {
    item = makeDoor(side);
    item.scale.setScalar(1.15);
    placeSide(item, side, 2.9, 0);
  } else if (slot === 1) {
    item = makePictureFrame(i % 4, side);
    item.scale.setScalar(1.9);
    item.rotation.y = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
    item.position.x = side === 'left' ? -2.95 : 2.95;
    item.position.y = 2.9;
  } else if (slot === 2) {
    item = makeWallLamp();
    item.scale.setScalar(1.6);
    item.rotation.y = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
    item.position.x = side === 'left' ? -2.92 : 2.92;
    item.position.y = 3.0;
  } else if (slot === 3) {
    item = makeWindow(side);
    item.scale.setScalar(1.15);
    item.rotation.y = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
    item.position.x = side === 'left' ? -2.93 : 2.93;
    item.position.y = 0;
  } else if (slot === 4) {
    item = makeLaundryBasket();
    item.scale.setScalar(1.35);
    placeSide(item, side, 2.25, 0, false);
  } else {
    item = makePlant();
    item.scale.setScalar(1.7);
    placeSide(item, side, 2.3, 0, false);
  }
  return item;
}

function makeBedroomProp(i: number, side: 'left' | 'right'): THREE.Object3D {
  const slot = i % 4;
  let item: THREE.Object3D;
  if (slot === 0) {
    item = makeBedEdge();
    item.scale.setScalar(1.15);
    placeSide(item, side, 2.3, 0);
  } else if (slot === 1) {
    item = makeNightstand();
    item.scale.setScalar(1.3);
    placeSide(item, side, 2.25, 0, false);
  } else if (slot === 2) {
    item = makeCabinet();
    item.scale.setScalar(1.35);
    placeSide(item, side, 2.25, 0);
  } else {
    item = makeSideTable();
    item.scale.setScalar(1.45);
    placeSide(item, side, 2.2, 0, false);
  }
  return item;
}

function makeRoomProp(theme: RoomTheme, i: number, side: 'left' | 'right'): THREE.Object3D {
  switch (theme) {
    case 'kitchen':
      return makeKitchenProp(i, side);
    case 'living':
      return makeLivingProp(i, side);
    case 'hallway':
      return makeHallwayProp(i, side);
    case 'bedroom':
      return makeBedroomProp(i, side);
  }
}

/**
 * Build the scrolling house interior shell + themed room decor pool (CE-local).
 * Visual-only: does not change lane collision or obstacle gameplay.
 */
export function createHallway(scene: THREE.Scene): HallwayBundle {
  const floorTex = makeFloorTexture();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 200),
    new THREE.MeshLambertMaterial({ map: floorTex }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.position.z = -80;
  scene.add(floor);

  const wallTex = makeWallTexture();
  const wallMat = new THREE.MeshLambertMaterial({
    map: wallTex,
    side: THREE.FrontSide,
  });
  const wallL = new THREE.Mesh(new THREE.PlaneGeometry(200, 6), wallMat);
  wallL.rotation.y = Math.PI / 2;
  wallL.position.set(-3, 3, -80);
  scene.add(wallL);
  const wallR = wallL.clone();
  wallR.rotation.y = -Math.PI / 2;
  wallR.position.set(3, 3, -80);
  scene.add(wallR);

  const ceilingTex = makeCeilingTexture();
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 200),
    new THREE.MeshLambertMaterial({ map: ceilingTex }),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 6;
  ceiling.position.z = -80;
  scene.add(ceiling);

  // Soft runner rug down the center of the hall (visual only — not collidable)
  const runnerMat = new THREE.MeshLambertMaterial({ color: 0xa84838 });
  const runner = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 200), runnerMat);
  runner.rotation.x = -Math.PI / 2;
  runner.position.set(0, 0.01, -80);
  scene.add(runner);
  const runnerEdgeMat = new THREE.MeshLambertMaterial({ color: 0xe8d0a0 });
  for (const x of [-0.72, 0.72]) {
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 200), runnerEdgeMat);
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(x, 0.012, -80);
    scene.add(edge);
  }

  // Baseboards (skirt boards) — classic house interior
  const baseMat = new THREE.MeshLambertMaterial({ color: 0xf0e0c0 });
  const baseL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 200), baseMat);
  baseL.position.set(-2.94, 0.11, -80);
  scene.add(baseL);
  const baseR = baseL.clone();
  baseR.position.x = 2.94;
  scene.add(baseR);
  // Darker top cap on baseboard
  const capMat = new THREE.MeshLambertMaterial({ color: 0xd4b890 });
  const capL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 200), capMat);
  capL.position.set(-2.94, 0.24, -80);
  scene.add(capL);
  const capR = capL.clone();
  capR.position.x = 2.94;
  scene.add(capR);

  // Crown molding under ceiling
  const crownMat = new THREE.MeshLambertMaterial({ color: 0xf5e8d0 });
  const crownL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 200), crownMat);
  crownL.position.set(-2.94, 5.9, -80);
  scene.add(crownL);
  const crownR = crownL.clone();
  crownR.position.x = 2.94;
  scene.add(crownR);

  // Soft side floor rails (lane guides) — keep for gameplay readability
  const railMat = new THREE.MeshLambertMaterial({ color: 0x8a5a2c });
  const railGeo = new THREE.BoxGeometry(0.06, 0.03, 200);
  const railL = new THREE.Mesh(railGeo, railMat);
  railL.position.set(-0.8, 0.02, -80);
  scene.add(railL);
  const railR = railL.clone();
  railR.position.x = 0.8;
  scene.add(railR);

  // Warm hanging pendant lights along the hall
  const pendantMat = new THREE.MeshLambertMaterial({
    color: 0xffe8c0,
    emissive: 0xffaa60,
    emissiveIntensity: 0.45,
  });
  for (let i = 0; i < 8; i++) {
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.28, 10), pendantMat);
    shade.position.set(0, 5.55, -10 - i * 18);
    shade.rotation.x = Math.PI;
    scene.add(shade);
    const cord = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.4, 4),
      new THREE.MeshLambertMaterial({ color: 0x4a3020 }),
    );
    cord.position.set(0, 5.85, -10 - i * 18);
    scene.add(cord);
  }

  // Side area rugs (static shell accents) — living-room warmth without lane block
  const sideRugMat = new THREE.MeshLambertMaterial({ color: 0x8a4a38 });
  for (const x of [-2.1, 2.1]) {
    const sideRug = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 200), sideRugMat);
    sideRug.rotation.x = -Math.PI / 2;
    sideRug.position.set(x, 0.008, -80);
    scene.add(sideRug);
  }

  // Scrolling themed room decor — large, readable house props OFF playable lanes
  const DECOR_SPACING = 5.2;
  const decorItems: THREE.Object3D[] = [];
  const COUNT = 40;

  for (let i = 0; i < COUNT; i++) {
    const side: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right';
    const section = Math.floor(i / SECTION_LENGTH);
    const theme = ROOM_CYCLE[section % ROOM_CYCLE.length]!;
    const localI = i % SECTION_LENGTH;

    // Room transition arch at the start of each section (both sides feel like a portal)
    if (localI === 0) {
      const arch = makeRoomArch(side);
      arch.scale.setScalar(1.05);
      placeSide(arch, side, 2.85, 0);
      arch.position.z = -i * DECOR_SPACING;
      scene.add(arch);
      decorItems.push(arch);
      // Also place a small rug marker under the arch for room identity
      const marker = makeRug();
      marker.scale.setScalar(1.25);
      marker.position.x = side === 'left' ? -2.05 : 2.05;
      marker.position.y = 0;
      marker.position.z = -i * DECOR_SPACING - 0.5;
      scene.add(marker);
      decorItems.push(marker);
    }

    const item = makeRoomProp(theme, localI + (side === 'right' ? 1 : 0), side);

    // Occasional wall shelf / picture in non-hallway rooms for density
    if (theme !== 'hallway' && localI === 3) {
      const extra =
        theme === 'kitchen'
          ? makeShelf()
          : makePictureFrame((i + 2) % 4, side);
      extra.scale.setScalar(theme === 'kitchen' ? 1.35 : 1.7);
      if (theme === 'kitchen') {
        extra.rotation.y = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
        extra.position.x = side === 'left' ? -2.9 : 2.9;
        extra.position.y = 0;
      } else {
        extra.rotation.y = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
        extra.position.x = side === 'left' ? -2.95 : 2.95;
        extra.position.y = 2.85;
      }
      extra.position.z = -i * DECOR_SPACING - 1.2;
      scene.add(extra);
      decorItems.push(extra);
    }

    item.position.z = -i * DECOR_SPACING;
    scene.add(item);
    decorItems.push(item);
  }

  return { floorTex, wallTex, ceilingTex, decorItems, DECOR_SPACING };
}
