import * as THREE from 'three';
import { OBSTACLE_KINDS, type ObstacleKind } from './obstacleKinds';

/** Build Three.js meshes for an obstacle kind. Pure aside from THREE. */

export function buildObstacleMeshes(kind: ObstacleKind) {
  const group = new THREE.Group();
  const c = OBSTACLE_KINDS[kind].color;
  const matPrimary = new THREE.MeshLambertMaterial({ color: c });
  const matDark = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const matBrown = new THREE.MeshLambertMaterial({ color: 0x5a3a14 });
  const matMetal = new THREE.MeshLambertMaterial({ color: 0xa8a8a8 });
  const matGlass = new THREE.MeshLambertMaterial({ color: 0x4ec0ff, transparent: true, opacity: 0.7 });

  if (kind === 'spill') {
    // Flat brown puddle on the floor. Cylinder with very low height
    // and a wide radius.
    const spill = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.04, 16),
      matPrimary
    );
    spill.position.y = 0.02;
    group.add(spill);
    // A small "splash" droplet to the side
    const drop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.03, 8),
      matPrimary
    );
    drop.position.set(0.45, 0.015, 0.25);
    group.add(drop);
  } else if (kind === 'cable') {
    // Power cable lying across the floor. A long thin box.
    const cable = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.04, 0.9),
      matPrimary
    );
    cable.position.set(0, 0.04, 0);
    group.add(cable);
    // Plug at one end
    const plug = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.07, 0.08),
      matPrimary
    );
    plug.position.set(0, 0.06, 0.45);
    group.add(plug);
    // Strain relief
    const relief = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.08, 6),
      matPrimary
    );
    relief.rotation.x = Math.PI / 2;
    relief.position.set(0, 0.06, 0.39);
    group.add(relief);
  } else if (kind === 'mug') {
    // Tipped-over coffee mug on the floor.
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.22, 12),
      matPrimary
    );
    body.position.y = 0.11;
    // Tip it on its side
    body.rotation.z = Math.PI / 2;
    group.add(body);
    // Handle
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.07, 0.02, 6, 10, Math.PI),
      matPrimary
    );
    handle.rotation.y = Math.PI / 2;
    handle.position.set(0.13, 0.11, 0);
    group.add(handle);
    // Coffee spill puddle next to it
    const puddle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.20, 0.20, 0.02, 12),
      new THREE.MeshLambertMaterial({ color: 0x3a1f08 })
    );
    puddle.position.set(-0.18, 0.01, 0);
    group.add(puddle);
  } else if (kind === 'chair') {
    // Chair on wheels. 5-star base + post + seat + back.
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6),
      matDark
    );
    post.position.y = 0.18;
    group.add(post);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.20, 0.20, 0.05, 8),
      matDark
    );
    base.position.y = 0.025;
    group.add(base);
    // 5 wheel legs
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const wheel = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 6, 6),
        matDark
      );
      wheel.position.set(Math.cos(a) * 0.18, 0.03, Math.sin(a) * 0.18);
      group.add(wheel);
    }
    // Seat
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.08, 0.5),
      matPrimary
    );
    seat.position.y = 0.45;
    group.add(seat);
    // Back
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.7, 0.08),
      matPrimary
    );
    back.position.set(0, 0.85, -0.21);
    group.add(back);
  } else if (kind === 'box') {
    // Cardboard box or toy box with tape across the top.
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.7),
      matPrimary
    );
    box.position.y = 0.35;
    group.add(box);
    // Tape line across the top
    const tape = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.02, 0.10),
      matBrown
    );
    tape.position.y = 0.7;
    group.add(tape);
  } else if (kind === 'plant') {
    // Potted plant.
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.20, 0.16, 0.30, 10),
      new THREE.MeshLambertMaterial({ color: 0xb87333 })
    );
    pot.position.y = 0.15;
    group.add(pot);
    // Soil
    const soil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.19, 0.02, 10),
      new THREE.MeshLambertMaterial({ color: 0x3a1f08 })
    );
    soil.position.y = 0.30;
    group.add(soil);
    // Leaves
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const leaf = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.40, 6),
        new THREE.MeshLambertMaterial({ color: 0x4a8a3a })
      );
      leaf.position.set(Math.cos(a) * 0.12, 0.55, Math.sin(a) * 0.12);
      leaf.rotation.z = Math.cos(a) * 0.4;
      leaf.rotation.x = Math.sin(a) * 0.4;
      group.add(leaf);
    }
  } else if (kind === 'printer') {
    // Laundry basket — woven basket with clothes peeking out.
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.45, 0.6),
      matPrimary
    );
    body.position.y = 0.22;
    group.add(body);
    // Paper output slot on top
    const slot = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.04, 0.2),
      matPrimary
    );
    slot.position.y = 0.46;
    group.add(slot);
    // Paper sticking out
    const paper = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.02, 0.14),
      new THREE.MeshLambertMaterial({ color: 0xffffff })
    );
    paper.position.y = 0.49;
    group.add(paper);
    // Buttons
    for (let i = 0; i < 3; i++) {
      const btn = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 6, 6),
        new THREE.MeshLambertMaterial({ color: i === 0 ? 0x2ec27e : 0xc0392b })
      );
      btn.position.set(-0.20 + i * 0.07, 0.46, 0.31);
      group.add(btn);
    }
  } else if (kind === 'watercooler') {
    // Tall floor lamp or bookshelf.
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.5, 0.4),
      new THREE.MeshLambertMaterial({ color: 0xeeeeee })
    );
    base.position.y = 0.25;
    group.add(base);
    // Tap
    const tap = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.04, 0.05),
      matMetal
    );
    tap.position.set(0, 0.30, 0.22);
    group.add(tap);
    // Big blue bottle on top
    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.16, 0.55, 10),
      matGlass
    );
    bottle.position.y = 0.78;
    group.add(bottle);
    // Cap
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.10, 0.08, 8),
      new THREE.MeshLambertMaterial({ color: 0xffffff })
    );
    cap.position.y = 1.10;
    group.add(cap);
  } else if (kind === 'filingcabinet') {
    // Wooden dresser with 3 drawers.
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.95, 0.4),
      matPrimary
    );
    body.position.y = 0.475;
    group.add(body);
    // 3 drawer handles
    for (let i = 0; i < 3; i++) {
      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.025, 0.025),
        matMetal
      );
      handle.position.set(0, 0.18 + i * 0.30, 0.21);
      group.add(handle);
    }
  } else if (kind === 'desk') {
    // Wide dining table: flat top with 4 legs. Spans 2 lanes.
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.06, 0.7),
      matPrimary
    );
    top.position.y = 0.75;
    group.add(top);
    // 4 legs
    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.75, 6);
    for (const [x, z] of [[-0.78, 0.30], [0.78, 0.30], [-0.78, -0.30], [0.78, -0.30]]) {
      const leg = new THREE.Mesh(legGeo, matBrown);
      leg.position.set(x, 0.375, z);
      group.add(leg);
    }
    // A monitor on top
    const monitorStand = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.10, 0.05),
      matDark
    );
    monitorStand.position.set(-0.4, 0.83, 0);
    group.add(monitorStand);
    const monitor = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.28, 0.03),
      matDark
    );
    monitor.position.set(-0.4, 1.00, 0);
    group.add(monitor);
    // Keyboard
    const keyboard = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.02, 0.15),
      new THREE.MeshLambertMaterial({ color: 0x222222 })
    );
    keyboard.position.set(0.3, 0.79, 0.15);
    group.add(keyboard);
  } else if (kind === 'worker') {
    // Sleepy person slumped at a dining table. Wide (spans 2 lanes).
    // Table is just a thin slab (the "desk" kind has the full table;
    // here we just need the sleeper on a small table for context).
    const deskTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.06, 0.7),
      new THREE.MeshLambertMaterial({ color: 0x8a4a1f })
    );
    deskTop.position.y = 0.75;
    group.add(deskTop);
    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.75, 6);
    for (const [x, z] of [[-0.78, 0.30], [0.78, 0.30], [-0.78, -0.30], [0.78, -0.30]]) {
      const leg = new THREE.Mesh(legGeo, matBrown);
      leg.position.set(x, 0.375, z);
      group.add(leg);
    }
    // Worker body (cylinder) slumped forward
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.55, 10),
      matPrimary
    );
    body.position.set(-0.3, 1.05, 0.20);
    body.rotation.x = -0.6; // slumped forward
    group.add(body);
    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0xe7b78f })
    );
    head.position.set(-0.3, 1.30, 0.40);
    group.add(head);
    // Hair patch
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.10, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: 0x3a2a1a })
    );
    hair.position.set(-0.3, 1.40, 0.40);
    group.add(hair);
    // Closed eyes (two thin cylinders)
    for (const dx of [-0.05, 0.05]) {
      const eye = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.005, 0.005),
        new THREE.MeshLambertMaterial({ color: 0x1a0a02 })
      );
      eye.position.set(-0.3 + dx, 1.30, 0.52);
      group.add(eye);
    }
    // Keyboard they're slumped on
    const keyboard = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.02, 0.15),
      new THREE.MeshLambertMaterial({ color: 0x222222 })
    );
    keyboard.position.set(-0.3, 0.79, 0.30);
    group.add(keyboard);
  }

  // Scale all obstacles up so they read clearly as house furniture
  // rather than tiny props. 1.5× makes chairs, boxes, etc. visually
  // prominent without breaking jumpability (player jump apex ≈ 1.8u,
  // tallest scaled obstacle ≈ 1.4u).
  group.scale.setScalar(1.5);
  return group;
}
