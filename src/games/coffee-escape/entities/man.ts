import * as THREE from 'three';

export interface ManHandles {
  man: THREE.Group;
  manArmL: THREE.Object3D;
  manArmR: THREE.Object3D;
  manLegL: THREE.Object3D;
  manLegR: THREE.Object3D;
  face: {
    browL: THREE.Object3D;
    browR: THREE.Object3D;
    mouth: THREE.Object3D;
    eyeL: THREE.Object3D;
    eyeR: THREE.Object3D;
  };
}

/**
 * Tired man chaser — clean stylized 3D (CE-local).
 * Simple readable shapes, funny morning-robe dad, not creepy.
 * Stays on the RIGHT of the track so he never covers the caffeine meter.
 */
export function createMan(scene: THREE.Scene, _leftLaneX: number): ManHandles {
  const man = new THREE.Group();
  // Slightly smaller overall so he never dominates the frame
  man.scale.setScalar(0.82);

  // Clear palette that pops against warm house floors
  const robeMat = new THREE.MeshLambertMaterial({ color: 0xc07040 });
  const trimMat = new THREE.MeshLambertMaterial({ color: 0xe8c090 });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xf0d0b0 });
  const hairMat = new THREE.MeshLambertMaterial({ color: 0x5a4030 });
  const pantMat = new THREE.MeshLambertMaterial({ color: 0x4a6080 });
  const slipMat = new THREE.MeshLambertMaterial({ color: 0x8a5030 });
  const eyeWhiteMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const pupilMat = new THREE.MeshLambertMaterial({ color: 0x2a2018 });
  const browMat = new THREE.MeshLambertMaterial({ color: 0x3a2818 });
  const mouthMat = new THREE.MeshLambertMaterial({ color: 0xc07070 });

  // ===== TORSO — single clean capsule + closed robe, no melt flaps =====
  const torso = new THREE.Group();
  torso.position.y = 0.95;

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.26, 0.48, 4, 10),
    robeMat,
  );
  body.position.y = 0.05;
  body.scale.set(1.05, 1, 0.8);
  torso.add(body);

  // Soft shoulders
  const shoulderL = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 6),
    robeMat,
  );
  shoulderL.position.set(-0.28, 0.28, 0);
  torso.add(shoulderL);
  const shoulderR = shoulderL.clone();
  shoulderR.position.x = 0.28;
  torso.add(shoulderR);

  // Collar band (simple ring, not messy flaps)
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.035, 6, 12),
    trimMat,
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.38, 0.02);
  collar.scale.set(1.1, 0.9, 1);
  torso.add(collar);

  // Sash
  const sash = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.07, 0.38), trimMat);
  sash.position.set(0, -0.12, 0.02);
  torso.add(sash);

  // Light pajama V under collar (readable house clothes)
  const shirt = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.28, 0.06),
    new THREE.MeshLambertMaterial({ color: 0xf5e8d0 }),
  );
  shirt.position.set(0, 0.2, 0.2);
  torso.add(shirt);

  man.add(torso);

  // ===== HEAD — clean sphere + simple cap hair =====
  const headG = new THREE.Group();
  headG.position.set(0, 1.58, 0.04);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), skinMat);
  head.scale.set(0.95, 1.02, 0.92);
  headG.add(head);

  // Clean hair cap — sits ON TOP of head, not a face-covering blob
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.175, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.48),
    hairMat,
  );
  hair.position.set(0, 0.02, -0.01);
  hair.scale.set(1.05, 0.95, 1.0);
  headG.add(hair);

  // Small sideburns only (not temples blobs)
  const sideL = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.08, 0.06),
    hairMat,
  );
  sideL.position.set(-0.16, -0.02, 0.02);
  headG.add(sideL);
  const sideR = sideL.clone();
  sideR.position.x = 0.16;
  headG.add(sideR);

  // Ears — small, out of the way
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), skinMat);
  earL.position.set(-0.175, 0, 0);
  earL.scale.set(0.55, 1, 0.7);
  headG.add(earL);
  const earR = earL.clone();
  earR.position.x = 0.175;
  headG.add(earR);

  // ===== FACE — flat, readable, tired/funny (no stacked melt spheres) =====
  // Eye whites
  const eyeL = new THREE.Mesh(
    new THREE.SphereGeometry(0.032, 8, 6),
    eyeWhiteMat,
  );
  eyeL.position.set(-0.06, 0.02, 0.155);
  eyeL.scale.set(1.15, 0.85, 0.5);
  headG.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.06;
  headG.add(eyeR);

  // Pupils (centered, slightly large = "need coffee")
  const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), pupilMat);
  pupilL.position.set(-0.055, 0.022, 0.175);
  headG.add(pupilL);
  const pupilR = pupilL.clone();
  pupilR.position.x = 0.065;
  headG.add(pupilR);

  // Simple upper lids (thin dark line, not bags of flesh)
  const lidL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.02), browMat);
  lidL.position.set(-0.06, 0.045, 0.17);
  headG.add(lidL);
  const lidR = lidL.clone();
  lidR.position.x = 0.06;
  headG.add(lidR);

  // Eyebrows — gentle worried arch
  const browL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.014, 0.016), browMat);
  browL.position.set(-0.065, 0.075, 0.16);
  browL.rotation.z = 0.2;
  headG.add(browL);
  const browR = browL.clone();
  browR.position.x = 0.065;
  browR.rotation.z = -0.2;
  headG.add(browR);

  // Tiny nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), skinMat);
  nose.position.set(0, -0.015, 0.175);
  nose.scale.set(0.7, 0.85, 0.75);
  headG.add(nose);

  // Small smile-line mouth (tired "please coffee")
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.018, 0.015), mouthMat);
  mouth.position.set(0, -0.075, 0.16);
  mouth.scale.set(1, 0.7, 1);
  headG.add(mouth);

  man.add(headG);

  // ===== ARMS — clean capsules, shoulder pivots =====
  function makeArm(side: -1 | 1): THREE.Group {
    const root = new THREE.Group();
    root.position.set(side * 0.36, 1.2, 0);

    const upper = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.055, 0.26, 3, 8),
      robeMat,
    );
    upper.position.y = -0.18;
    root.add(upper);

    const lowerG = new THREE.Group();
    lowerG.position.y = -0.36;
    const lower = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.048, 0.22, 3, 8),
      skinMat,
    );
    lower.position.y = -0.14;
    lowerG.add(lower);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), skinMat);
    hand.position.y = -0.3;
    hand.scale.set(1.05, 0.8, 0.9);
    lowerG.add(hand);

    root.add(lowerG);
    root.rotation.z = side * 0.1;
    root.rotation.x = -0.2;
    return root;
  }

  const manArmL = makeArm(-1);
  const manArmR = makeArm(1);
  // Mild reach with right hand
  manArmR.rotation.x = -0.45;
  man.add(manArmL);
  man.add(manArmR);

  // ===== LEGS =====
  function makeLeg(side: -1 | 1): THREE.Group {
    const root = new THREE.Group();
    root.position.set(side * 0.12, 0.62, 0);

    const thigh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.075, 0.24, 3, 8),
      pantMat,
    );
    thigh.position.y = -0.18;
    root.add(thigh);

    const shinG = new THREE.Group();
    shinG.position.y = -0.36;
    const shin = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.065, 0.22, 3, 8),
      pantMat,
    );
    shin.position.y = -0.14;
    shinG.add(shin);

    // Simple slipper
    const slip = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.055, 0.2), slipMat);
    slip.position.set(0, -0.32, 0.03);
    shinG.add(slip);

    root.add(shinG);
    return root;
  }

  const manLegL = makeLeg(-1);
  const manLegR = makeLeg(1);
  man.add(manLegL);
  man.add(manLegR);

  // RIGHT side of track, well behind the cup — never over caffeine meter (bottom-left)
  const rightX = 1.6 + 0.7; // outside right lane
  man.position.set(rightX, 0, 5.2);
  // Face slightly toward center / cup
  man.rotation.y = -0.25;
  scene.add(man);

  return {
    man,
    manArmL,
    manArmR,
    manLegL,
    manLegR,
    face: { browL, browR, mouth, eyeL, eyeR },
  };
}
