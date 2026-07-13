import type { Camera, Vector3 } from 'three';

/** Floating +N score popup inside the stage. */
export function spawnPopup(
  stage: HTMLElement,
  text: string,
  x: number,
  y: number,
  color?: string,
): void {
  const el = document.createElement('div');
  el.className = 'ce-popup';
  el.textContent = text;
  if (color) el.style.color = color;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  stage.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

export function worldToScreen(
  worldPos: Vector3,
  camera: Camera,
  stage: HTMLElement,
): { x: number; y: number } {
  const v = worldPos.clone().project(camera);
  const rect = stage.getBoundingClientRect();
  return {
    x: (v.x * 0.5 + 0.5) * rect.width,
    y: (-v.y * 0.5 + 0.5) * rect.height,
  };
}
