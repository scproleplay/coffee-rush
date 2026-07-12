import * as THREE from 'three';

export interface ManHandles {
  man: THREE.Group;
  manArmL: THREE.Mesh;
  manArmR: THREE.Mesh;
  manLegL: THREE.Mesh;
  manLegR: THREE.Mesh;
}

/**
 * Tired man chaser (CE-local only).
 * Simple placeholder character behind the cup.
 * Changing this cannot affect other arcade games.
 */
export function createMan(scene: THREE.Scene, leftLaneX: number): ManHandles {
  const man = new THREE.Group();

  const manBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 1.0, 10),
    new THREE.MeshLambertMaterial({ color: 0xa04a2a }),
  );
  manBody.position.y = 0.9;
  man.add(manBody);

  const manHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xe7b78f }),
  );
  manHead.position.y = 1.6;
  man.add(manHead);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0x3a2a1a }),
  );
  hair.position.y = 1.7;
  man.add(hair);

  const manArmGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6);
  const manArmL = new THREE.Mesh(
    manArmGeo,
    new THREE.MeshLambertMaterial({ color: 0xa04a2a }),
  );
  manArmL.position.set(-0.45, 1.0, 0);
  man.add(manArmL);
  const manArmR = manArmL.clone();
  manArmR.position.x = 0.45;
  man.add(manArmR);

  const manLegGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.7, 6);
  const manLegL = new THREE.Mesh(
    manLegGeo,
    new THREE.MeshLambertMaterial({ color: 0x2b3a55 }),
  );
  manLegL.position.set(-0.15, 0.25, 0);
  man.add(manLegL);
  const manLegR = manLegL.clone();
  manLegR.position.x = 0.15;
  man.add(manLegR);

  man.position.set(leftLaneX - 0.6, 0, 4.0);
  scene.add(man);
  return { man, manArmL, manArmR, manLegL, manLegR };
}
