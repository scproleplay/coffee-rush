import * as THREE from 'three';

export interface ManHandles {
  man: THREE.Group;
  /** Limb roots (groups) — rotate around shoulder / hip pivots. */
  manArmL: THREE.Object3D;
  manArmR: THREE.Object3D;
  manLegL: THREE.Object3D;
  manLegR: THREE.Object3D;
  /** Optional face parts for expression tweaks. */
  face: {
    browL: THREE.Object3D;
    browR: THREE.Object3D;
    mouth: THREE.Object3D;
    eyeL: THREE.Object3D;
    eyeR: THREE.Object3D;
  };
}

/**
 * Tired man chaser — stylized-realistic house-morning look (CE-local).
 * Lightweight primitives only; Z driven by chase danger meter.
 * Funny, family-friendly, desperate-for-coffee energy — not scary.
 */
export function createMan(scene: THREE.Scene, leftLaneX: number): ManHandles {
  const man = new THREE.Group();

  // Warm morning palette — soft robe, pajama pants, cozy slippers
  const robeMat = new THREE.MeshLambertMaterial({ color: 0x9a5a38 });
  const robeDarkMat = new THREE.MeshLambertMaterial({ color: 0x7a4028 });
  const robeTrimMat = new THREE.MeshLambertMaterial({ color: 0xd4a070 });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xe8c4a0 });
  const skinShadowMat = new THREE.MeshLambertMaterial({ color: 0xd4a888 });
  const hairMat = new THREE.MeshLambertMaterial({ color: 0x4a3220 });
  const hairGreyMat = new THREE.MeshLambertMaterial({ color: 0x8a7a6a });
  const pantMat = new THREE.MeshLambertMaterial({ color: 0x3a4a62 });
  const pantStripeMat = new THREE.MeshLambertMaterial({ color: 0x4a5a72 });
  const slipMat = new THREE.MeshLambertMaterial({ color: 0x6a3a1a });
  const slipInnerMat = new THREE.MeshLambertMaterial({ color: 0xc08060 });
  const eyeWhiteMat = new THREE.MeshLambertMaterial({ color: 0xfff8f0 });
  const pupilMat = new THREE.MeshLambertMaterial({ color: 0x2a2018 });
  const browMat = new THREE.MeshLambertMaterial({ color: 0x3a2818 });
  const mouthMat = new THREE.MeshLambertMaterial({ color: 0xb06060 });

  // --- Torso (shoulders + chest + soft belly under open robe) ---
  const torso = new THREE.Group();
  torso.position.y = 1.05;
  torso.rotation.x = 0.1; // tired forward lean

  // Shoulders / upper chest
  const chest = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.28, 0.42, 4, 10),
    robeMat,
  );
  chest.position.y = 0.05;
  chest.scale.set(1.15, 1, 0.85);
  torso.add(chest);

  // Soft belly (pajama under robe)
  const belly = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xf0e0c8 }),
  );
  belly.position.set(0, -0.28, 0.12);
  belly.scale.set(1.15, 0.85, 0.9);
  torso.add(belly);

  // Open robe flaps
  const flapL = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.85, 0.08),
    robeDarkMat,
  );
  flapL.position.set(-0.18, -0.15, 0.22);
  flapL.rotation.y = 0.35;
  flapL.rotation.z = 0.08;
  torso.add(flapL);
  const flapR = flapL.clone();
  flapR.position.x = 0.18;
  flapR.rotation.y = -0.35;
  flapR.rotation.z = -0.08;
  torso.add(flapR);

  // Collar / lapels
  const collarL = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.28, 0.06),
    robeTrimMat,
  );
  collarL.position.set(-0.14, 0.28, 0.24);
  collarL.rotation.z = 0.4;
  collarL.rotation.x = -0.2;
  torso.add(collarL);
  const collarR = collarL.clone();
  collarR.position.x = 0.14;
  collarR.rotation.z = -0.4;
  torso.add(collarR);

  // Belt / sash
  const sash = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.08, 0.42),
    robeTrimMat,
  );
  sash.position.set(0, -0.22, 0.05);
  torso.add(sash);
  const sashKnot = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 6),
    robeTrimMat,
  );
  sashKnot.position.set(0.12, -0.22, 0.24);
  torso.add(sashKnot);

  man.add(torso);

  // --- Head + face ---
  const headG = new THREE.Group();
  headG.position.set(0, 1.72, 0.08);
  headG.rotation.x = 0.06;

  const skull = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 14, 12),
    skinMat,
  );
  skull.scale.set(0.95, 1.05, 0.92);
  headG.add(skull);

  // Soft jaw
  const jaw = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 8),
    skinShadowMat,
  );
  jaw.position.set(0, -0.1, 0.04);
  jaw.scale.set(0.95, 0.7, 0.85);
  headG.add(jaw);

  // Ears
  const earGeo = new THREE.SphereGeometry(0.045, 8, 6);
  const earL = new THREE.Mesh(earGeo, skinMat);
  earL.position.set(-0.19, 0, 0);
  earL.scale.set(0.6, 1, 0.8);
  headG.add(earL);
  const earR = earL.clone();
  earR.position.x = 0.19;
  headG.add(earR);

  // Messy morning hair (tufts + grey temples)
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hairMat,
  );
  hairCap.position.y = 0.04;
  hairCap.scale.set(1.02, 1.05, 1.0);
  headG.add(hairCap);

  const tuft = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 6),
    hairMat,
  );
  tuft.position.set(-0.06, 0.18, 0.02);
  tuft.scale.set(1.2, 0.9, 0.8);
  headG.add(tuft);
  const tuft2 = tuft.clone();
  tuft2.position.set(0.08, 0.16, -0.02);
  tuft2.scale.set(1.0, 0.75, 0.9);
  headG.add(tuft2);

  const templeL = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 6, 6),
    hairGreyMat,
  );
  templeL.position.set(-0.16, 0.02, 0.08);
  headG.add(templeL);
  const templeR = templeL.clone();
  templeR.position.x = 0.16;
  headG.add(templeR);

  // Face — tired / desperate-for-coffee (readable, not creepy)
  const eyeWhiteGeo = new THREE.SphereGeometry(0.038, 8, 6);
  const eyeL = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
  eyeL.position.set(-0.07, 0.03, 0.16);
  eyeL.scale.set(1.1, 0.75, 0.6);
  headG.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.07;
  headG.add(eyeR);

  // Heavy lower lids (bags)
  const bagMat = new THREE.MeshLambertMaterial({ color: 0xd0a080 });
  const bagL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.02), bagMat);
  bagL.position.set(-0.07, -0.01, 0.175);
  headG.add(bagL);
  const bagR = bagL.clone();
  bagR.position.x = 0.07;
  headG.add(bagR);

  // Pupils — slightly wide / focused on the cup
  const pupilGeo = new THREE.SphereGeometry(0.018, 8, 6);
  const pupilL = new THREE.Mesh(pupilGeo, pupilMat);
  pupilL.position.set(-0.065, 0.035, 0.19);
  headG.add(pupilL);
  const pupilR = pupilL.clone();
  pupilR.position.x = 0.075;
  headG.add(pupilR);

  // Droopy upper lids
  const lidMat = new THREE.MeshLambertMaterial({ color: 0xe0b898 });
  const lidL = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.022, 0.03), lidMat);
  lidL.position.set(-0.07, 0.055, 0.175);
  lidL.rotation.x = -0.35;
  headG.add(lidL);
  const lidR = lidL.clone();
  lidR.position.x = 0.07;
  headG.add(lidR);

  // Eyebrows — worried / pleading
  const browL = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.018, 0.02),
    browMat,
  );
  browL.position.set(-0.075, 0.09, 0.17);
  browL.rotation.z = 0.25;
  headG.add(browL);
  const browR = browL.clone();
  browR.position.x = 0.075;
  browR.rotation.z = -0.25;
  headG.add(browR);

  // Soft nose
  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 8, 6),
    skinShadowMat,
  );
  nose.position.set(0, -0.01, 0.195);
  nose.scale.set(0.7, 0.9, 0.85);
  headG.add(nose);

  // Mouth — small open "need coffee" oof
  const mouth = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 8, 6),
    mouthMat,
  );
  mouth.position.set(0, -0.09, 0.17);
  mouth.scale.set(0.9, 0.45, 0.55);
  headG.add(mouth);

  // Stubble shadow
  const stubble = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xc4a080 }),
  );
  stubble.position.set(0, -0.12, 0.1);
  stubble.scale.set(0.95, 0.55, 0.7);
  headG.add(stubble);

  man.add(headG);

  // --- Arms (groups pivot at shoulders for clean run cycle) ---
  function makeArm(side: -1 | 1): THREE.Group {
    const root = new THREE.Group();
    // Shoulder pivot sits on torso
    root.position.set(side * 0.38, 1.28, 0.02);

    const upper = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.065, 0.28, 3, 8),
      robeMat,
    );
    upper.position.y = -0.2;
    root.add(upper);

    // Elbow joint
    const elbow = new THREE.Group();
    elbow.position.y = -0.38;
    const lower = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.055, 0.24, 3, 8),
      skinMat,
    );
    lower.position.y = -0.16;
    elbow.add(lower);

    // Hand
    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 6),
      skinMat,
    );
    hand.position.y = -0.34;
    hand.scale.set(1.1, 0.75, 0.9);
    elbow.add(hand);

    // Reaching fingers (simple mitt)
    const fingers = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.04, 0.06),
      skinMat,
    );
    fingers.position.set(0, -0.4, 0.02);
    elbow.add(fingers);

    root.add(elbow);
    // Slight reach-forward rest pose
    root.rotation.x = -0.25;
    root.rotation.z = side * 0.12;
    return root;
  }

  const manArmL = makeArm(-1);
  const manArmR = makeArm(1);
  // Lead with right arm a bit (grabby for coffee)
  manArmR.rotation.x = -0.55;
  man.add(manArmL);
  man.add(manArmR);

  // --- Legs (hip pivots) ---
  function makeLeg(side: -1 | 1): THREE.Group {
    const root = new THREE.Group();
    root.position.set(side * 0.14, 0.72, 0);

    const thigh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.09, 0.28, 3, 8),
      pantMat,
    );
    thigh.position.y = -0.2;
    root.add(thigh);

    // Stripe detail on pajama
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.35, 0.02),
      pantStripeMat,
    );
    stripe.position.set(side * 0.06, -0.2, 0.08);
    root.add(stripe);

    const knee = new THREE.Group();
    knee.position.y = -0.4;
    const shin = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.075, 0.26, 3, 8),
      pantMat,
    );
    shin.position.y = -0.16;
    knee.add(shin);

    // Slipper
    const slip = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.07, 0.26),
      slipMat,
    );
    slip.position.set(0, -0.38, 0.04);
    knee.add(slip);
    const slipToe = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 6),
      slipInnerMat,
    );
    slipToe.position.set(0, -0.36, 0.14);
    slipToe.scale.set(1, 0.7, 0.9);
    knee.add(slipToe);

    root.add(knee);
    return root;
  }

  const manLegL = makeLeg(-1);
  const manLegR = makeLeg(1);
  man.add(manLegL);
  man.add(manLegR);

  // Behind / side start pose — chase meter moves him closer
  man.position.set(leftLaneX - 0.55, 0, 4.15);
  scene.add(man);

  return {
    man,
    manArmL,
    manArmR,
    manLegL,
    manLegR,
    face: {
      browL,
      browR,
      mouth,
      eyeL,
      eyeR,
    },
  };
}
