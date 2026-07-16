import * as THREE from 'three';

export interface SceneBundle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  cameraBaseY: number;
  cameraBaseZ: number;
}

/**
 * Three.js scene bootstrap (CE-local) — warm house interior lighting.
 * Canvas must already exist in the DOM.
 */
export function createScene(canvas: HTMLCanvasElement): SceneBundle {
  const scene = new THREE.Scene();
  // Warm cream house atmosphere (not cool office)
  scene.background = new THREE.Color(0xffefd6);
  scene.fog = new THREE.Fog(0xffd9a8, 18, 78);

  const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 200);
  const cameraBaseY = 2.6;
  const cameraBaseZ = 4.5;
  camera.position.set(0, cameraBaseY, cameraBaseZ);
  camera.lookAt(0, 1.0, -8);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(0xffefd6, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Soft ambient house light — warmer floor bounce
  const hemi = new THREE.HemisphereLight(0xfff0d8, 0x9a6038, 0.85);
  scene.add(hemi);

  // Warm key light (afternoon window feel)
  const sun = new THREE.DirectionalLight(0xffe4b8, 1.05);
  sun.position.set(3.5, 9, -2);
  scene.add(sun);

  // Warm fill from opposite side (keep house, not office)
  const fill = new THREE.DirectionalLight(0xffd0a8, 0.32);
  fill.position.set(-5, 5, 2);
  scene.add(fill);

  // Warm rim near camera / cup
  const rim = new THREE.PointLight(0xffb070, 0.55, 10, 2);
  rim.position.set(0, 0.6, 2);
  scene.add(rim);

  // Ceiling wash — soft overhead house lamps
  const ceilingWash = new THREE.PointLight(0xffe8c8, 0.42, 40, 2);
  ceilingWash.position.set(0, 5.2, -20);
  scene.add(ceilingWash);

  // Secondary warm pool farther down the hall (room depth)
  const farWarm = new THREE.PointLight(0xffc080, 0.28, 50, 2);
  farWarm.position.set(0, 3.5, -35);
  scene.add(farWarm);

  return { scene, camera, renderer, cameraBaseY, cameraBaseZ };
}
