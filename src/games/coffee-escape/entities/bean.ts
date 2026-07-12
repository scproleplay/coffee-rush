import * as THREE from 'three';

export interface BeanMesh {
  mesh: THREE.Group;
  lane: number;
  z: number;
  y: number;
  rot: number;
  active: boolean;
}

/**
 * Coffee-bean collectible (CE-local only).
 */
export function makeBean(): BeanMesh {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0x4a2a10 }),
  );
  body.scale.set(1, 0.6, 0.7);
  group.add(body);

  const crease = new THREE.Mesh(
    new THREE.SphereGeometry(0.135, 10, 6),
    new THREE.MeshBasicMaterial({ color: 0x8a5a2c }),
  );
  crease.scale.set(0.4, 0.6, 0.72);
  group.add(crease);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 6),
    new THREE.MeshBasicMaterial({
      color: 0xffe5b0,
      transparent: true,
      opacity: 0.3,
    }),
  );
  group.add(halo);

  return {
    mesh: group,
    lane: 1,
    z: -50,
    y: 1.0,
    rot: 0,
    active: false,
  };
}
