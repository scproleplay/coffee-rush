import * as THREE from 'three';
import {
  makeCeilingTexture,
  makeFloorTexture,
  makeWallTexture,
} from './textures';
import {
  makeArmchair,
  makeCabinet,
  makeDoor,
  makeKitchenCounter,
  makePictureFrame,
  makePlant,
  makeRug,
  makeShelf,
  makeSideTable,
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
 * Build the scrolling house interior shell + side decor pool (CE-local).
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

  // Warm hanging pendant lights along the hall (static shell, scrolls via fog feel)
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

  // Scrolling side decor — denser house props (kept OFF playable lanes)
  const DECOR_SPACING = 5.8;
  const decorItems: THREE.Object3D[] = [];
  const COUNT = 36;

  for (let i = 0; i < COUNT; i++) {
    const side: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right';
    const pattern = i % 11;
    let item: THREE.Object3D;

    if (pattern === 0) {
      item = makeDoor(side);
      item.scale.setScalar(1);
      item.position.x = side === 'left' ? -2.9 : 2.9;
      item.position.y = 0;
      item.rotation.y = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
    } else if (pattern === 1) {
      item = makePictureFrame(i % 4, side);
      item.scale.setScalar(1.55);
      item.rotation.y = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
      item.position.x = side === 'left' ? -2.95 : 2.95;
      item.position.y = 2.75;
    } else if (pattern === 2) {
      item = makeWallLamp();
      item.scale.setScalar(1.4);
      item.rotation.y = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
      item.position.x = side === 'left' ? -2.92 : 2.92;
      item.position.y = 2.9;
    } else if (pattern === 3) {
      item = makeWindow(side);
      item.scale.setScalar(1);
      item.rotation.y = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
      item.position.x = side === 'left' ? -2.93 : 2.93;
      item.position.y = 0;
    } else if (pattern === 4) {
      item = makeArmchair();
      item.scale.setScalar(1.15);
      item.position.x = side === 'left' ? -2.15 : 2.15;
      item.position.y = 0;
      item.rotation.y = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
    } else if (pattern === 5) {
      item = makeCabinet();
      item.scale.setScalar(1.2);
      item.position.x = side === 'left' ? -2.25 : 2.25;
      item.position.y = 0;
      item.rotation.y = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
    } else if (pattern === 6) {
      item = makeKitchenCounter();
      item.scale.setScalar(1.05);
      item.position.x = side === 'left' ? -2.2 : 2.2;
      item.position.y = 0;
      item.rotation.y = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
    } else if (pattern === 7) {
      item = makeShelf();
      item.scale.setScalar(1.2);
      item.rotation.y = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
      item.position.x = side === 'left' ? -2.9 : 2.9;
      item.position.y = 0;
    } else if (pattern === 8) {
      item = makeSideTable();
      item.scale.setScalar(1.35);
      item.position.x = side === 'left' ? -2.2 : 2.2;
      item.position.y = 0;
    } else if (pattern === 9) {
      item = makePlant();
      item.scale.setScalar(1.5);
      item.position.x = side === 'left' ? -2.25 : 2.25;
      item.position.y = 0;
    } else {
      item = makeRug();
      item.scale.setScalar(1.1);
      // Keep side rugs out of center lane
      item.position.x = side === 'left' ? -2.0 : 2.0;
      item.position.y = 0;
      item.rotation.y = Math.PI / 2;
    }

    item.position.z = -i * DECOR_SPACING;
    scene.add(item);
    decorItems.push(item);
  }

  return { floorTex, wallTex, ceilingTex, decorItems, DECOR_SPACING };
}
