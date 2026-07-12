import * as THREE from 'three';

export interface CupHandles {
  cup: THREE.Group;
  armLGroup: THREE.Group;
  armRGroup: THREE.Group;
  legLGroup: THREE.Group;
  legRGroup: THREE.Group;
  steamGroup: THREE.Group;
  contactShadow: THREE.Mesh;
}

/**
 * Player coffee-cup character (CE-local only).
 * Returns mesh handles the update loop animates.
 * Not shared across games — safe to change without affecting Rush/etc.
 */
export function createCup(scene: THREE.Scene, centerLaneX: number): CupHandles {
  const cup = new THREE.Group();

  const matCupBody = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const matRim = new THREE.MeshLambertMaterial({ color: 0xe8d8b8 });
  const matCoffee = new THREE.MeshLambertMaterial({ color: 0x3a1f08 });
  const matCrema = new THREE.MeshLambertMaterial({ color: 0x8a5a2c });
  const matSleeve = new THREE.MeshLambertMaterial({ color: 0xc98a4d });
  const matSleeveRim = new THREE.MeshLambertMaterial({ color: 0xa86d3a });
  const matLogo = new THREE.MeshLambertMaterial({ color: 0xff5a1f });
  const matFace = new THREE.MeshLambertMaterial({ color: 0x1a0a02 });
  const matCheek = new THREE.MeshLambertMaterial({
    color: 0xff8a6b,
    transparent: true,
    opacity: 0.55,
  });
  const matLimb = new THREE.MeshLambertMaterial({ color: 0x5a3a14 });
  const matHand = new THREE.MeshLambertMaterial({ color: 0xe7b78f });
  const matShoe = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const matSteam = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.45,
  });

  const cupBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.34, 0.85, 16),
    matCupBody,
  );
  cupBody.position.y = 0.55;
  cup.add(cupBody);

  const cupRim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 8, 24), matRim);
  cupRim.rotation.x = Math.PI / 2;
  cupRim.position.y = 0.98;
  cup.add(cupRim);

  const coffeeSurface = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.36, 0.02, 16),
    matCoffee,
  );
  coffeeSurface.position.y = 0.965;
  cup.add(coffeeSurface);

  const crema = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.005, 12),
    matCrema,
  );
  crema.position.y = 0.978;
  cup.add(crema);

  const sleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.4, 0.32, 16, 1, true),
    matSleeve,
  );
  sleeve.position.y = 0.36;
  cup.add(sleeve);

  const sleeveRimTop = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.025, 6, 16),
    matSleeveRim,
  );
  sleeveRimTop.rotation.x = Math.PI / 2;
  sleeveRimTop.position.y = 0.52;
  cup.add(sleeveRimTop);
  const sleeveRimBot = sleeveRimTop.clone();
  sleeveRimBot.position.y = 0.2;
  cup.add(sleeveRimBot);

  const logoGroup = new THREE.Group();
  logoGroup.position.set(0, 0.36, 0.42);
  const logoLobeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), matLogo);
  logoLobeL.position.set(-0.045, 0.02, 0);
  logoGroup.add(logoLobeL);
  const logoLobeR = logoLobeL.clone();
  logoLobeR.position.x = 0.045;
  logoGroup.add(logoLobeR);
  const logoTip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 4), matLogo);
  logoTip.rotation.x = Math.PI;
  logoTip.position.set(0, -0.06, 0);
  logoGroup.add(logoTip);
  cup.add(logoGroup);

  const faceGroup = new THREE.Group();
  faceGroup.position.set(0, 0.78, 0.41);
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), matFace);
  eyeL.position.set(-0.1, 0, 0);
  faceGroup.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.1;
  faceGroup.add(eyeR);
  const matHighlight = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const hlL = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), matHighlight);
  hlL.position.set(-0.085, 0.018, 0.035);
  faceGroup.add(hlL);
  const hlR = hlL.clone();
  hlR.position.x = 0.115;
  faceGroup.add(hlR);
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI),
    matFace,
  );
  smile.rotation.x = Math.PI / 2;
  smile.position.set(0, -0.06, 0);
  smile.rotation.z = Math.PI;
  faceGroup.add(smile);
  const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), matCheek);
  cheekL.position.set(-0.16, -0.04, 0.01);
  faceGroup.add(cheekL);
  const cheekR = cheekL.clone();
  cheekR.position.x = 0.16;
  faceGroup.add(cheekR);
  cup.add(faceGroup);

  const armLGroup = new THREE.Group();
  armLGroup.position.set(-0.38, 0.66, 0);
  const armLMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8),
    matLimb,
  );
  armLMesh.position.y = -0.2;
  armLGroup.add(armLMesh);
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), matHand);
  handL.position.y = -0.4;
  armLGroup.add(handL);
  cup.add(armLGroup);

  const armRGroup = new THREE.Group();
  armRGroup.position.set(0.38, 0.66, 0);
  const armRMesh = armLMesh.clone();
  armRMesh.position.y = -0.2;
  armRGroup.add(armRMesh);
  const handR = handL.clone();
  handR.position.y = -0.4;
  armRGroup.add(handR);
  cup.add(armRGroup);

  const legLGroup = new THREE.Group();
  legLGroup.position.set(-0.14, 0.14, 0);
  const legLMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.32, 8),
    matLimb,
  );
  legLMesh.position.y = -0.16;
  legLGroup.add(legLMesh);
  const shoeL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), matShoe);
  shoeL.scale.set(1, 0.5, 1.3);
  shoeL.position.set(0, -0.32, 0.02);
  legLGroup.add(shoeL);
  cup.add(legLGroup);

  const legRGroup = new THREE.Group();
  legRGroup.position.set(0.14, 0.14, 0);
  const legRMesh = legLMesh.clone();
  legRMesh.position.y = -0.16;
  legRGroup.add(legRMesh);
  const shoeR = shoeL.clone();
  shoeR.position.set(0, -0.32, 0.02);
  legRGroup.add(shoeR);
  cup.add(legRGroup);

  const steamGroup = new THREE.Group();
  steamGroup.position.set(0, 1.0, 0);
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), matSteam);
    s.position.set((i - 1) * 0.08, i * 0.12, 0);
    s.userData.phase = i * 1.2;
    steamGroup.add(s);
  }
  cup.add(steamGroup);

  cup.position.set(centerLaneX, 0, 0);
  scene.add(cup);

  const contactShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.48, 24),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(centerLaneX, 0.012, 0);
  contactShadow.renderOrder = 1;
  scene.add(contactShadow);

  return {
    cup,
    armLGroup,
    armRGroup,
    legLGroup,
    legRGroup,
    steamGroup,
    contactShadow,
  };
}
