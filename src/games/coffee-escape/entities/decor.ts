import * as THREE from 'three';
import { makePictureTexture } from '../engine/textures';

/** Hallway side decorations (CE-local). */

export function makePictureFrame(variant: number, side: 'left' | 'right') {
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

export function makeWallLamp() {
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

export function makePlant() {
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

export function makeSideTable() {
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