import * as THREE from 'three';

export interface SceneBundle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  cameraBaseY: number;
  cameraBaseZ: number;
}

/**
 * Three.js scene bootstrap (CE-local).
 * Canvas must already exist in the DOM.
 */
export function createScene(canvas: HTMLCanvasElement): SceneBundle {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfff1d6);
  scene.fog = new THREE.Fog(0xffd9a8, 22, 90);

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
  renderer.setClearColor(0xfff1d6, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const hemi = new THREE.HemisphereLight(0xfff1d6, 0xb87333, 0.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe5b0, 0.95);
  sun.position.set(4, 10, -3);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xc8d8ff, 0.3);
  fill.position.set(-5, 6, 2);
  scene.add(fill);
  const rim = new THREE.PointLight(0xffb070, 0.4, 8, 2);
  rim.position.set(0, 0.5, 2);
  scene.add(rim);

  return { scene, camera, renderer, cameraBaseY, cameraBaseZ };
}
