import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import type { GameState } from '../engine/types';

export interface RenderFrameCtx {
  state: GameState;
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  stage: HTMLElement;
}

/** One render pass + optional crash/collect flash overlay. */
export function renderFrame(ctx: RenderFrameCtx): void {
  const { state, renderer, scene, camera, stage } = ctx;
  renderer.render(scene, camera);
  if (state.flash > 0) {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;inset:0;background:rgba(255,255,255,${state.flash * 1.2});pointer-events:none;z-index:3;`;
    stage.appendChild(el);
    setTimeout(() => el.remove(), 60);
  }
}
