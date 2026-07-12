import * as THREE from 'three';
import {
  BOOST_PARTICLE_POOL,
  DUST_POOL_SIZE,
  MOTE_COUNT,
} from './constants';

export interface DustParticle {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  color: string;
}

export interface BoostParticle {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  vy: number;
}

export interface FxPools {
  motes: THREE.Mesh[];
  dustPool: DustParticle[];
  boostParticles: BoostParticle[];
  boostGlow: THREE.Mesh;
}

/** Ambient motes + dust + boost particle pools (CE-local). */
export function createFxPools(scene: THREE.Scene): FxPools {
  const motes: THREE.Mesh[] = [];
  for (let i = 0; i < MOTE_COUNT; i++) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 6, 6),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4,
      }),
    );
    m.position.set(
      (Math.random() - 0.5) * 6,
      1.2 + Math.random() * 4.5,
      -10 - Math.random() * 70,
    );
    m.userData.phase = Math.random() * Math.PI * 2;
    m.userData.driftY = 0.4 + Math.random() * 0.4;
    scene.add(m);
    motes.push(m);
  }

  const dustPool: DustParticle[] = [];
  for (let i = 0; i < DUST_POOL_SIZE; i++) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 6, 6),
      new THREE.MeshBasicMaterial({
        color: 0xffd24a,
        transparent: true,
        opacity: 0.9,
      }),
    );
    mesh.visible = false;
    scene.add(mesh);
    dustPool.push({
      mesh,
      life: 0,
      maxLife: 0.5,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      r: 0.18,
      color: '#ffd24a',
    });
  }

  const boostParticles: BoostParticle[] = [];
  for (let i = 0; i < BOOST_PARTICLE_POOL; i++) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 6, 6),
      new THREE.MeshBasicMaterial({
        color: 0x6ec6ff,
        transparent: true,
        opacity: 0.8,
      }),
    );
    mesh.visible = false;
    scene.add(mesh);
    boostParticles.push({ mesh, life: 0, maxLife: 0.5, vy: 0 });
  }

  const boostGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 12, 10),
    new THREE.MeshBasicMaterial({
      color: 0x6ec6ff,
      transparent: true,
      opacity: 0,
    }),
  );
  boostGlow.position.set(0, 0.5, 0);
  scene.add(boostGlow);

  return { motes, dustPool, boostParticles, boostGlow };
}
