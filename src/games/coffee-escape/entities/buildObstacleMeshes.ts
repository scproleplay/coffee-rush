import * as THREE from 'three';
import { OBSTACLE_KINDS, type ObstacleKind } from './obstacleKinds';

/** Build larger, readable house-obstacle meshes (visual only — collision is logical). */

export function buildObstacleMeshes(kind: ObstacleKind) {
  const group = new THREE.Group();
  const c = OBSTACLE_KINDS[kind].color;
  const matPrimary = new THREE.MeshLambertMaterial({ color: c });
  const matDark = new THREE.MeshLambertMaterial({ color: 0x2a2018 });
  const matBrown = new THREE.MeshLambertMaterial({ color: 0x5a3a14 });
  const matWood = new THREE.MeshLambertMaterial({ color: 0x9a5a28 });
  const matCream = new THREE.MeshLambertMaterial({ color: 0xf0e0c8 });
  const matCloth = new THREE.MeshLambertMaterial({ color: 0xd08090 });

  if (kind === 'spill') {
    const spill = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.78, 0.05, 18),
      matPrimary,
    );
    spill.position.y = 0.03;
    group.add(spill);
    const drop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.2, 0.04, 10),
      matPrimary,
    );
    drop.position.set(0.55, 0.02, 0.3);
    group.add(drop);
    const drop2 = drop.clone();
    drop2.position.set(-0.4, 0.02, -0.25);
    drop2.scale.setScalar(0.7);
    group.add(drop2);
  } else if (kind === 'cable') {
    // Thick house power strip + cable across the lane
    const cable = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 1.15), matPrimary);
    cable.position.set(0, 0.05, 0);
    group.add(cable);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.2), matDark);
    strip.position.set(0, 0.06, 0.55);
    group.add(strip);
    for (let i = 0; i < 3; i++) {
      const socket = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.02, 0.08),
        new THREE.MeshLambertMaterial({ color: 0x111111 }),
      );
      socket.position.set(-0.1 + i * 0.1, 0.12, 0.55);
      group.add(socket);
    }
  } else if (kind === 'rug') {
    const rug = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.04, 1.0), matPrimary);
    rug.position.y = 0.025;
    group.add(rug);
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.03, 1.1),
      new THREE.MeshLambertMaterial({ color: 0xe8d5a8 }),
    );
    border.position.y = 0.015;
    group.add(border);
    // Fringe
    for (const z of [-0.55, 0.55]) {
      const fringe = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.02, 0.08),
        new THREE.MeshLambertMaterial({ color: 0xf5e6c8 }),
      );
      fringe.position.set(0, 0.02, z);
      group.add(fringe);
    }
  } else if (kind === 'books') {
    const colors = [0xc04040, 0x3a6a9a, 0xd4a020, 0x4a7a40, 0x6a4080];
    for (let i = 0; i < 5; i++) {
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.08 + (i % 3) * 0.04, 0.32),
        new THREE.MeshLambertMaterial({ color: colors[i]! }),
      );
      book.position.set((i - 2) * 0.12, 0.08 + (i % 2) * 0.06, (i % 2) * 0.05);
      book.rotation.y = (i - 2) * 0.08;
      book.rotation.z = (i % 2) * 0.15;
      group.add(book);
    }
  } else if (kind === 'toys') {
    // Toy block pile
    const blocks = [
      { c: 0xe07040, p: [0, 0.18, 0] as const, s: [0.45, 0.35, 0.45] as const },
      { c: 0x40a0e0, p: [-0.28, 0.14, 0.1] as const, s: [0.28, 0.28, 0.28] as const },
      { c: 0xf0d040, p: [0.3, 0.12, -0.05] as const, s: [0.24, 0.24, 0.24] as const },
      { c: 0x50c060, p: [0.05, 0.42, 0.05] as const, s: [0.22, 0.22, 0.22] as const },
    ];
    for (const b of blocks) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(b.s[0], b.s[1], b.s[2]),
        new THREE.MeshLambertMaterial({ color: b.c }),
      );
      mesh.position.set(b.p[0], b.p[1], b.p[2]);
      group.add(mesh);
    }
  } else if (kind === 'chair') {
    // Kitchen / dining chair — chunky and readable
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.1, 0.7), matPrimary);
    seat.position.y = 0.55;
    group.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.85, 0.1), matPrimary);
    back.position.set(0, 1.0, -0.3);
    group.add(back);
    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.55, 6);
    for (const [x, z] of [
      [-0.28, 0.25],
      [0.28, 0.25],
      [-0.28, -0.25],
      [0.28, -0.25],
    ] as const) {
      const leg = new THREE.Mesh(legGeo, matBrown);
      leg.position.set(x, 0.27, z);
      group.add(leg);
    }
  } else if (kind === 'stool') {
    const seat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.34, 0.08, 12),
      matWood,
    );
    seat.position.y = 0.7;
    group.add(seat);
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.66, 8),
      matBrown,
    );
    post.position.y = 0.35;
    group.add(post);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.3, 0.06, 10),
      matDark,
    );
    base.position.y = 0.03;
    group.add(base);
  } else if (kind === 'pillow') {
    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.45, 0.7),
      matCloth,
    );
    pillow.position.y = 0.28;
    pillow.rotation.z = 0.15;
    pillow.rotation.y = 0.2;
    group.add(pillow);
    const pillow2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.35, 0.55),
      new THREE.MeshLambertMaterial({ color: 0xe8c0a0 }),
    );
    pillow2.position.set(0.15, 0.35, 0.1);
    pillow2.rotation.z = -0.25;
    group.add(pillow2);
  } else if (kind === 'box') {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 0.9), matPrimary);
    box.position.y = 0.43;
    group.add(box);
    const tape = new THREE.Mesh(
      new THREE.BoxGeometry(0.98, 0.04, 0.14),
      matBrown,
    );
    tape.position.y = 0.86;
    group.add(tape);
    const tape2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.04, 0.92),
      matBrown,
    );
    tape2.position.y = 0.86;
    group.add(tape2);
    // Label
    const label = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.25, 0.02),
      matCream,
    );
    label.position.set(0, 0.5, 0.46);
    group.add(label);
  } else if (kind === 'laundry') {
    // Laundry basket with clothes
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.42, 0.7, 12),
      matPrimary,
    );
    body.position.y = 0.35;
    group.add(body);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.04, 6, 16),
      matWood,
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.7;
    group.add(rim);
    const shirt = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.2, 0.35),
      new THREE.MeshLambertMaterial({ color: 0x4a80c0 }),
    );
    shirt.position.set(0.05, 0.78, 0);
    shirt.rotation.z = 0.2;
    group.add(shirt);
    const sock = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.12, 0.15),
      new THREE.MeshLambertMaterial({ color: 0xf0f0f0 }),
    );
    sock.position.set(-0.2, 0.75, 0.1);
    group.add(sock);
  } else if (kind === 'table') {
    // Wide coffee / dining table spanning two lanes
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.95), matPrimary);
    top.position.y = 0.72;
    group.add(top);
    const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.7, 6);
    for (const [x, z] of [
      [-1.05, 0.35],
      [1.05, 0.35],
      [-1.05, -0.35],
      [1.05, -0.35],
    ] as const) {
      const leg = new THREE.Mesh(legGeo, matBrown);
      leg.position.set(x, 0.35, z);
      group.add(leg);
    }
    // Bowl on top
    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.12, 0.12, 10),
      matCream,
    );
    bowl.position.set(0.3, 0.84, 0);
    group.add(bowl);
  } else if (kind === 'doorframe') {
    // Half-open door frame blocking two lanes visually
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.2, 0.18), matWood);
    postL.position.set(-1.15, 1.1, 0);
    group.add(postL);
    const postR = postL.clone();
    postR.position.x = 1.15;
    group.add(postR);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.18, 0.2), matWood);
    lintel.position.set(0, 2.15, 0);
    group.add(lintel);
    // Door leaf swung into lanes (solid block mid-height)
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.9, 0.1), matPrimary);
    door.position.set(-0.35, 0.95, 0.15);
    door.rotation.y = 0.45;
    group.add(door);
    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xd4af37 }),
    );
    knob.position.set(0.15, 0.95, 0.35);
    group.add(knob);
  }

  return group;
}
