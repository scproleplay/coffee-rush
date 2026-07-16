import * as THREE from 'three';
import type { SectionId } from './sections';
import { SECTION_ORDER } from './sections';
import {
  makeCeilingTexture,
  makeFloorTexture,
  makeGrassTexture,
  makeKitchenFloorTexture,
  makeKitchenWallTexture,
  makeLivingWallTexture,
  makePathTexture,
  makeWallTexture,
} from './textures';
import {
  makeArmchair,
  makeBookshelf,
  makeBush,
  makeCabinet,
  makeCoffeeTable,
  makeCouch,
  makeDiningSet,
  makeDoor,
  makeFencePanel,
  makeFloorLamp,
  makeFlowerPot,
  makeFridge,
  makeGardenGate,
  makeHoseReel,
  makeKitchenCounter,
  makeLaundryBasket,
  makePatioChair,
  makePictureFrame,
  makePillowStack,
  makePlant,
  makeRoomArch,
  makeRug,
  makeShelf,
  makeSideTable,
  makeStove,
  makeTvStand,
  makeWallLamp,
  makeWindow,
} from '../entities/decor';

export interface HallwayBundle {
  /** Active floor texture (reassigned on section change — always scroll this). */
  floorTex: THREE.CanvasTexture;
  wallTex: THREE.CanvasTexture;
  ceilingTex: THREE.CanvasTexture;
  pathTex: THREE.CanvasTexture;
  decorItems: THREE.Object3D[];
  DECOR_SPACING: number;
  applySectionLook: (id: SectionId) => void;
  resetEnvironment: () => void;
}

type Side = 'left' | 'right';

function placeSide(
  item: THREE.Object3D,
  side: Side,
  x: number,
  y: number,
  faceInward = true,
): void {
  item.position.x = side === 'left' ? -x : x;
  item.position.y = y;
  if (faceInward) {
    item.rotation.y = side === 'left' ? Math.PI / 2 : -Math.PI / 2;
  }
}

function makeLivingProp(i: number, side: Side): THREE.Object3D {
  const slot = i % 6;
  let item: THREE.Object3D;
  if (slot === 0) {
    item = makeCouch();
    item.scale.setScalar(1.25);
    placeSide(item, side, 2.25, 0);
  } else if (slot === 1) {
    item = makeTvStand();
    item.scale.setScalar(1.2);
    placeSide(item, side, 2.3, 0);
  } else if (slot === 2) {
    item = makeFloorLamp();
    item.scale.setScalar(1.3);
    placeSide(item, side, 2.35, 0, false);
  } else if (slot === 3) {
    item = makeCoffeeTable();
    item.scale.setScalar(1.15);
    placeSide(item, side, 2.15, 0, false);
  } else if (slot === 4) {
    item = makeBookshelf();
    item.scale.setScalar(1.15);
    placeSide(item, side, 2.35, 0);
  } else {
    item = i % 2 === 0 ? makePillowStack() : makeArmchair();
    item.scale.setScalar(i % 2 === 0 ? 1.2 : 1.3);
    placeSide(item, side, 2.2, 0, i % 2 !== 0);
  }
  return item;
}

function makeKitchenProp(i: number, side: Side): THREE.Object3D {
  const slot = i % 5;
  let item: THREE.Object3D;
  if (slot === 0) {
    item = makeFridge();
    item.scale.setScalar(1.2);
    placeSide(item, side, 2.35, 0);
  } else if (slot === 1) {
    item = makeStove();
    item.scale.setScalar(1.2);
    placeSide(item, side, 2.3, 0);
  } else if (slot === 2) {
    item = makeKitchenCounter();
    item.scale.setScalar(1.25);
    placeSide(item, side, 2.25, 0);
  } else if (slot === 3) {
    item = makeDiningSet();
    item.scale.setScalar(1.15);
    placeSide(item, side, 2.2, 0);
  } else {
    item = makeCabinet();
    item.scale.setScalar(1.3);
    placeSide(item, side, 2.25, 0);
  }
  return item;
}

function makeHallwayProp(i: number, side: Side): THREE.Object3D {
  const slot = i % 6;
  let item: THREE.Object3D;
  if (slot === 0) {
    item = makeDoor(side);
    item.scale.setScalar(1.15);
    placeSide(item, side, 2.9, 0);
  } else if (slot === 1) {
    item = makePictureFrame(i % 4, side);
    item.scale.setScalar(1.9);
    item.rotation.y = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
    item.position.x = side === 'left' ? -2.95 : 2.95;
    item.position.y = 2.9;
  } else if (slot === 2) {
    item = makeWallLamp();
    item.scale.setScalar(1.6);
    item.rotation.y = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
    item.position.x = side === 'left' ? -2.92 : 2.92;
    item.position.y = 3.0;
  } else if (slot === 3) {
    item = makeWindow(side);
    item.scale.setScalar(1.15);
    item.rotation.y = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
    item.position.x = side === 'left' ? -2.93 : 2.93;
    item.position.y = 0;
  } else if (slot === 4) {
    item = makeLaundryBasket();
    item.scale.setScalar(1.35);
    placeSide(item, side, 2.25, 0, false);
  } else {
    item = makePlant();
    item.scale.setScalar(1.7);
    placeSide(item, side, 2.3, 0, false);
  }
  return item;
}

function makeGardenProp(i: number, side: Side): THREE.Object3D {
  const slot = i % 6;
  let item: THREE.Object3D;
  if (slot === 0) {
    item = makeFencePanel();
    item.scale.setScalar(1.15);
    placeSide(item, side, 2.85, 0, false);
  } else if (slot === 1) {
    item = makeBush();
    item.scale.setScalar(1.2);
    placeSide(item, side, 2.4, 0, false);
  } else if (slot === 2) {
    item = makeFlowerPot();
    item.scale.setScalar(1.35);
    placeSide(item, side, 2.2, 0, false);
  } else if (slot === 3) {
    item = makePatioChair();
    item.scale.setScalar(1.15);
    placeSide(item, side, 2.25, 0, false);
  } else if (slot === 4) {
    item = makeHoseReel();
    item.scale.setScalar(1.2);
    placeSide(item, side, 2.3, 0, false);
  } else {
    item = makePlant();
    item.scale.setScalar(1.8);
    placeSide(item, side, 2.35, 0, false);
  }
  return item;
}

function makeSectionProp(theme: SectionId, i: number, side: Side): THREE.Object3D {
  switch (theme) {
    case 'living':
      return makeLivingProp(i, side);
    case 'kitchen':
      return makeKitchenProp(i, side);
    case 'hallway':
      return makeHallwayProp(i, side);
    case 'garden':
      return makeGardenProp(i, side);
  }
}

function makeTransitionMarker(theme: SectionId, side: Side): THREE.Object3D {
  if (theme === 'garden') {
    const gate = makeGardenGate(side);
    gate.scale.setScalar(1.1);
    placeSide(gate, side, 2.7, 0, false);
    return gate;
  }
  const arch = makeRoomArch(side);
  arch.scale.setScalar(1.1);
  placeSide(arch, side, 2.85, 0);
  return arch;
}

/** Props per section (both sides interleaved). */
const PROPS_PER_SECTION: Record<SectionId, number> = {
  living: 14,
  kitchen: 14,
  hallway: 12,
  garden: 14,
};

/**
 * Build the scrolling house-journey environment (CE-local).
 * Shell materials + fog change per section; decor follows living→kitchen→hallway→garden.
 */
export function createHallway(scene: THREE.Scene): HallwayBundle {
  const woodFloorTex = makeFloorTexture();
  const kitchenFloorTex = makeKitchenFloorTexture();
  const grassTex = makeGrassTexture();
  const pathTex = makePathTexture();
  const hallWallTex = makeWallTexture();
  const livingWallTex = makeLivingWallTexture();
  const kitchenWallTex = makeKitchenWallTexture();
  const ceilingTex = makeCeilingTexture();

  const floorMat = new THREE.MeshLambertMaterial({ map: woodFloorTex });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 220), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -90);
  scene.add(floor);

  const wallMat = new THREE.MeshLambertMaterial({
    map: livingWallTex,
    side: THREE.FrontSide,
  });
  const wallL = new THREE.Mesh(new THREE.PlaneGeometry(220, 6), wallMat);
  wallL.rotation.y = Math.PI / 2;
  wallL.position.set(-3, 3, -90);
  scene.add(wallL);
  const wallR = new THREE.Mesh(new THREE.PlaneGeometry(220, 6), wallMat);
  wallR.rotation.y = -Math.PI / 2;
  wallR.position.set(3, 3, -90);
  scene.add(wallR);

  const ceilingMat = new THREE.MeshLambertMaterial({ map: ceilingTex });
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(14, 220), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 6, -90);
  scene.add(ceiling);

  const runnerMat = new THREE.MeshLambertMaterial({ color: 0xa84838 });
  const runner = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 220), runnerMat);
  runner.rotation.x = -Math.PI / 2;
  runner.position.set(0, 0.012, -90);
  runner.visible = false;
  scene.add(runner);

  const livingRugMat = new THREE.MeshLambertMaterial({ color: 0x8a4a38 });
  const livingRug = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 220),
    livingRugMat,
  );
  livingRug.rotation.x = -Math.PI / 2;
  livingRug.position.set(0, 0.011, -90);
  scene.add(livingRug);

  const pathMat = new THREE.MeshLambertMaterial({ map: pathTex });
  const path = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 220), pathMat);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.014, -90);
  path.visible = false;
  scene.add(path);

  const trimGroup = new THREE.Group();
  const baseMat = new THREE.MeshLambertMaterial({ color: 0xf0e0c0 });
  const baseL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 220), baseMat);
  baseL.position.set(-2.94, 0.11, -90);
  trimGroup.add(baseL);
  const baseR = baseL.clone();
  baseR.position.x = 2.94;
  trimGroup.add(baseR);
  const crownMat = new THREE.MeshLambertMaterial({ color: 0xf5e8d0 });
  const crownL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 220), crownMat);
  crownL.position.set(-2.94, 5.9, -90);
  trimGroup.add(crownL);
  const crownR = crownL.clone();
  crownR.position.x = 2.94;
  trimGroup.add(crownR);
  scene.add(trimGroup);

  const railMat = new THREE.MeshLambertMaterial({ color: 0x8a5a2c });
  const railL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 220), railMat);
  railL.position.set(-0.8, 0.02, -90);
  scene.add(railL);
  const railR = railL.clone();
  railR.position.x = 0.8;
  scene.add(railR);

  const fenceGroup = new THREE.Group();
  fenceGroup.visible = false;
  const fenceMat = new THREE.MeshLambertMaterial({ color: 0x8a6a38 });
  for (const x of [-2.95, 2.95]) {
    for (let i = 0; i < 20; i++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), fenceMat);
      post.position.set(x, 0.6, -10 - i * 10);
      fenceGroup.add(post);
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.9, 9.2),
        new THREE.MeshLambertMaterial({ color: 0xa08048 }),
      );
      board.position.set(x, 0.55, -10 - i * 10 - 4.5);
      fenceGroup.add(board);
    }
  }
  scene.add(fenceGroup);

  const pendantGroup = new THREE.Group();
  const pendantMat = new THREE.MeshLambertMaterial({
    color: 0xffe8c0,
    emissive: 0xffaa60,
    emissiveIntensity: 0.45,
  });
  for (let i = 0; i < 10; i++) {
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.28, 10),
      pendantMat,
    );
    shade.position.set(0, 5.55, -8 - i * 16);
    shade.rotation.x = Math.PI;
    pendantGroup.add(shade);
  }
  scene.add(pendantGroup);

  const roomKey = new THREE.DirectionalLight(0xffe4b8, 1.0);
  roomKey.position.set(3.5, 9, -2);
  scene.add(roomKey);
  const roomFill = new THREE.DirectionalLight(0xffd0a8, 0.3);
  roomFill.position.set(-5, 5, 2);
  scene.add(roomFill);
  const sunOutdoor = new THREE.DirectionalLight(0xfff2c8, 0);
  sunOutdoor.position.set(4, 14, -6);
  scene.add(sunOutdoor);

  const DECOR_SPACING = 7;
  const decorItems: THREE.Object3D[] = [];
  let zCursor = 0;

  for (const theme of SECTION_ORDER) {
    const count = PROPS_PER_SECTION[theme];
    for (let i = 0; i < count; i++) {
      const side: Side = i % 2 === 0 ? 'left' : 'right';
      const localI = Math.floor(i / 2);

      if (i === 0) {
        const markerL = makeTransitionMarker(theme, 'left');
        markerL.position.z = -zCursor;
        scene.add(markerL);
        decorItems.push(markerL);
        const markerR = makeTransitionMarker(theme, 'right');
        markerR.position.z = -zCursor;
        scene.add(markerR);
        decorItems.push(markerR);
        if (theme !== 'garden') {
          const rug = makeRug();
          rug.scale.setScalar(1.3);
          rug.position.set(side === 'left' ? -2.0 : 2.0, 0, -zCursor - 0.4);
          scene.add(rug);
          decorItems.push(rug);
        }
      }

      const item = makeSectionProp(
        theme,
        localI + (side === 'right' ? 1 : 0),
        side,
      );

      if (theme === 'kitchen' && localI === 2) {
        const shelf = makeShelf();
        shelf.scale.setScalar(1.35);
        shelf.rotation.y = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
        shelf.position.set(side === 'left' ? -2.9 : 2.9, 0, -zCursor - 1);
        scene.add(shelf);
        decorItems.push(shelf);
      }
      if (theme === 'living' && localI === 3) {
        const pic = makePictureFrame((i + 1) % 4, side);
        pic.scale.setScalar(1.7);
        pic.rotation.y = side === 'left' ? -Math.PI / 2 : Math.PI / 2;
        pic.position.set(side === 'left' ? -2.95 : 2.95, 2.85, -zCursor - 0.8);
        scene.add(pic);
        decorItems.push(pic);
      }
      if (theme === 'hallway' && localI === 1) {
        const sideTable = makeSideTable();
        sideTable.scale.setScalar(1.3);
        placeSide(sideTable, side, 2.2, 0, false);
        sideTable.position.z = -zCursor - 0.5;
        scene.add(sideTable);
        decorItems.push(sideTable);
      }

      item.position.z = -zCursor;
      scene.add(item);
      decorItems.push(item);
      zCursor += DECOR_SPACING;
    }
  }

  const bundle: HallwayBundle = {
    floorTex: woodFloorTex,
    wallTex: livingWallTex,
    ceilingTex,
    pathTex,
    decorItems,
    DECOR_SPACING,
    applySectionLook: () => {},
    resetEnvironment: () => {},
  };

  function applySectionLook(id: SectionId): void {
    const isGarden = id === 'garden';
    const isKitchen = id === 'kitchen';
    const isHall = id === 'hallway';
    const isLiving = id === 'living';

    if (isGarden) {
      floorMat.map = grassTex;
      bundle.floorTex = grassTex;
    } else if (isKitchen) {
      floorMat.map = kitchenFloorTex;
      bundle.floorTex = kitchenFloorTex;
    } else {
      floorMat.map = woodFloorTex;
      bundle.floorTex = woodFloorTex;
    }
    floorMat.needsUpdate = true;

    if (isGarden) {
      wallL.visible = false;
      wallR.visible = false;
      fenceGroup.visible = true;
      ceiling.visible = false;
      trimGroup.visible = false;
      pendantGroup.visible = false;
    } else {
      wallL.visible = true;
      wallR.visible = true;
      fenceGroup.visible = false;
      ceiling.visible = true;
      trimGroup.visible = true;
      pendantGroup.visible = !isKitchen;
      if (isKitchen) {
        wallMat.map = kitchenWallTex;
        bundle.wallTex = kitchenWallTex;
      } else if (isLiving) {
        wallMat.map = livingWallTex;
        bundle.wallTex = livingWallTex;
      } else {
        wallMat.map = hallWallTex;
        bundle.wallTex = hallWallTex;
      }
      wallMat.needsUpdate = true;
    }

    runner.visible = isHall;
    livingRug.visible = isLiving;
    path.visible = isGarden;

    if (isGarden) {
      scene.background = new THREE.Color(0x87b8e8);
      scene.fog = new THREE.Fog(0x9ec8a8, 22, 90);
      roomKey.color.setHex(0xfff0d0);
      roomKey.intensity = 0.35;
      roomFill.intensity = 0.15;
      sunOutdoor.intensity = 1.25;
    } else if (isKitchen) {
      scene.background = new THREE.Color(0xeef4f0);
      scene.fog = new THREE.Fog(0xd8e8e0, 16, 72);
      roomKey.color.setHex(0xf0f4ff);
      roomKey.intensity = 1.15;
      roomFill.intensity = 0.4;
      sunOutdoor.intensity = 0;
    } else if (isHall) {
      scene.background = new THREE.Color(0xffefd6);
      scene.fog = new THREE.Fog(0xffd9a8, 14, 68);
      roomKey.color.setHex(0xffe4b8);
      roomKey.intensity = 0.95;
      roomFill.intensity = 0.28;
      sunOutdoor.intensity = 0;
    } else {
      scene.background = new THREE.Color(0xffe8c8);
      scene.fog = new THREE.Fog(0xffd0a0, 16, 74);
      roomKey.color.setHex(0xffe0b0);
      roomKey.intensity = 1.05;
      roomFill.intensity = 0.35;
      sunOutdoor.intensity = 0;
    }
  }

  bundle.applySectionLook = applySectionLook;
  bundle.resetEnvironment = () => applySectionLook('living');
  applySectionLook('living');

  return bundle;
}
