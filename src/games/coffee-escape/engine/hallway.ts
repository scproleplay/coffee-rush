import * as THREE from 'three';
import {
  makeCeilingTexture,
  makeFloorTexture,
  makeWallTexture,
} from './textures';
import {
  makePictureFrame,
  makePlant,
  makeSideTable,
  makeWallLamp,
} from '../entities/decor';

export interface HallwayBundle {
  floorTex: THREE.CanvasTexture;
  wallTex: THREE.CanvasTexture;
  ceilingTex: THREE.CanvasTexture;
  decorItems: THREE.Object3D[];
  DECOR_SPACING: number;
}

/**
 * Build the scrolling hallway shell + side decor pool (CE-local).
 * Restored as a factory so runtime stays thin and hallway can't be
 * accidentally deleted mid-refactor again.
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

  const railMat = new THREE.MeshLambertMaterial({ color: 0x8a5a2c });
  const railGeo = new THREE.BoxGeometry(0.08, 0.05, 200);
  const railL = new THREE.Mesh(railGeo, railMat);
  railL.position.set(-0.8, 0.025, -80);
  scene.add(railL);
  const railR = railL.clone();
  railR.position.x = 0.8;
  scene.add(railR);

  const skirtMat = new THREE.MeshLambertMaterial({ color: 0x5a3a14 });
  const skirtL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 200), skirtMat);
  skirtL.position.set(-2.96, 0.09, -80);
  scene.add(skirtL);
  const skirtR = skirtL.clone();
  skirtR.position.x = 2.96;
  scene.add(skirtR);

  const DECOR_SPACING = 8;
  const decorItems: THREE.Object3D[] = [];
  for (let i = 0; i < 26; i++) {
    const side = i % 2 === 0 ? 'left' : 'right';
    const decorType = i % 4;
    let item: THREE.Object3D;
    if (decorType === 0) {
      item = makePictureFrame(i % 4, side);
    } else if (decorType === 1) {
      item = makeWallLamp();
    } else if (decorType === 2) {
      item = makePlant();
    } else {
      item = makeSideTable();
    }
    item.scale.setScalar(1.5);
    if (decorType === 0 || decorType === 1) {
      item.rotation.y = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
      item.position.x = side === 'left' ? -2.95 : 2.95;
      item.position.y = 2.6;
    } else {
      item.position.x = side === 'left' ? -2.2 : 2.2;
      item.position.y = 0;
    }
    item.position.z = -i * DECOR_SPACING;
    scene.add(item);
    decorItems.push(item);
  }

  return { floorTex, wallTex, ceilingTex, decorItems, DECOR_SPACING };
}
