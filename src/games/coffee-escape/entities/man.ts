import * as THREE from 'three';

export interface ManHandles {
  man: THREE.Group;
  manArmL: THREE.Mesh;
  manArmR: THREE.Mesh;
  manLegL: THREE.Mesh;
  manLegR: THREE.Mesh;
}

/**
 * Tired man chaser silhouette (CE-local only).
 * Position Z is driven by the chase danger meter (see chaseLogic / updateFrame).
 * No pathfinding AI — he just eases closer as danger rises.
 */
export function createMan(scene: THREE.Scene, leftLaneX: number): ManHandles {
  const man = new THREE.Group();

  // Slightly muted “tired morning” palette — robe + pajama vibe
  const robeMat = new THREE.MeshLambertMaterial({ color: 0x7a4a2e });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xe0b48a });
  const hairMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
  const pantMat = new THREE.MeshLambertMaterial({ color: 0x3a4558 });

  const manBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.38, 1.05, 10),
    robeMat,
  );
  manBody.position.y = 0.95;
  man.add(manBody);

  // Soft belly / tired posture lean forward
  manBody.rotation.x = 0.12;

  const manHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), skinMat);
  manHead.position.y = 1.62;
  manHead.position.z = 0.06;
  man.add(manHead);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    hairMat,
  );
  hair.position.y = 1.72;
  hair.position.z = 0.04;
  man.add(hair);

  // Heavy eyelids (visual only)
  const lidMat = new THREE.MeshLambertMaterial({ color: 0x2a2018 });
  const lidL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), lidMat);
  lidL.position.set(-0.07, 1.66, 0.2);
  man.add(lidL);
  const lidR = lidL.clone();
  lidR.position.x = 0.07;
  man.add(lidR);

  const manArmGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.72, 6);
  const manArmL = new THREE.Mesh(manArmGeo, robeMat);
  manArmL.position.set(-0.46, 1.0, 0.05);
  man.add(manArmL);
  const manArmR = manArmL.clone();
  manArmR.position.x = 0.46;
  man.add(manArmR);

  const manLegGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.7, 6);
  const manLegL = new THREE.Mesh(manLegGeo, pantMat);
  manLegL.position.set(-0.15, 0.25, 0);
  man.add(manLegL);
  const manLegR = manLegL.clone();
  manLegR.position.x = 0.15;
  man.add(manLegR);

  // Slippers
  const slipMat = new THREE.MeshLambertMaterial({ color: 0x5a3a20 });
  const slipL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.22), slipMat);
  slipL.position.set(-0.15, 0.03, 0.06);
  man.add(slipL);
  const slipR = slipL.clone();
  slipR.position.x = 0.15;
  man.add(slipR);

  // Stay slightly off to the side / behind — atmosphere, not a fail state
  man.position.set(leftLaneX - 0.55, 0, 4.15);
  scene.add(man);
  return { man, manArmL, manArmR, manLegL, manLegR };
}
