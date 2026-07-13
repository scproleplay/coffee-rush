import { describe, expect, it } from 'vitest';
import {
  resolveStagePointerEnd,
  tapZoneFromX,
} from './pointerGestures';

describe('tapZoneFromX', () => {
  it('splits canvas into thirds', () => {
    expect(tapZoneFromX(10, 300)).toBe('left');
    expect(tapZoneFromX(150, 300)).toBe('center');
    expect(tapZoneFromX(250, 300)).toBe('right');
  });
});

describe('resolveStagePointerEnd', () => {
  it('maps horizontal swipe to lane', () => {
    expect(
      resolveStagePointerEnd({
        dx: -50,
        dy: 0,
        elapsedMs: 100,
        didMove: true,
        localX: 150,
        canvasWidth: 300,
      }),
    ).toEqual({ type: 'lane', delta: -1 });
  });

  it('maps upward swipe to jump', () => {
    expect(
      resolveStagePointerEnd({
        dx: 0,
        dy: -40,
        elapsedMs: 80,
        didMove: true,
        localX: 150,
        canvasWidth: 300,
      }),
    ).toEqual({ type: 'jump' });
  });

  it('maps center tap to jump', () => {
    expect(
      resolveStagePointerEnd({
        dx: 0,
        dy: 0,
        elapsedMs: 50,
        didMove: false,
        localX: 150,
        canvasWidth: 300,
      }),
    ).toEqual({ type: 'jump' });
  });

  it('maps left/right tap zones to lanes', () => {
    expect(
      resolveStagePointerEnd({
        dx: 0,
        dy: 0,
        elapsedMs: 50,
        didMove: false,
        localX: 20,
        canvasWidth: 300,
      }),
    ).toEqual({ type: 'lane', delta: -1 });
    expect(
      resolveStagePointerEnd({
        dx: 0,
        dy: 0,
        elapsedMs: 50,
        didMove: false,
        localX: 280,
        canvasWidth: 300,
      }),
    ).toEqual({ type: 'lane', delta: 1 });
  });

  it('forceTap treats fallback as zone tap', () => {
    expect(
      resolveStagePointerEnd({
        dx: 100,
        dy: 0,
        elapsedMs: 0,
        didMove: true,
        localX: 150,
        canvasWidth: 300,
        forceTap: true,
      }),
    ).toEqual({ type: 'jump' });
  });
});
