import { describe, expect, it } from 'vitest';
import {
  canBoost,
  canChangeLane,
  canJump,
  clampLane,
  keyToAction,
  nextLane,
  swipeToAction,
} from './inputLogic';

describe('canJump', () => {
  it('only while running on ground', () => {
    expect(canJump({ running: true, gameOver: false, onGround: true })).toBe(true);
    expect(canJump({ running: true, gameOver: false, onGround: false })).toBe(false);
    expect(canJump({ running: false, gameOver: false, onGround: true })).toBe(false);
    expect(canJump({ running: true, gameOver: true, onGround: true })).toBe(false);
  });
});

describe('canChangeLane', () => {
  it('requires active run', () => {
    expect(canChangeLane({ running: true, gameOver: false })).toBe(true);
    expect(canChangeLane({ running: false, gameOver: false })).toBe(false);
  });
});

describe('canBoost', () => {
  it('needs meter and inactive boost', () => {
    expect(
      canBoost({
        running: true,
        gameOver: false,
        boostActive: false,
        meter: 40,
        cost: 30,
      }),
    ).toBe(true);
    expect(
      canBoost({
        running: true,
        gameOver: false,
        boostActive: false,
        meter: 10,
        cost: 30,
      }),
    ).toBe(false);
    expect(
      canBoost({
        running: true,
        gameOver: false,
        boostActive: true,
        meter: 100,
        cost: 30,
      }),
    ).toBe(false);
  });
});

describe('lanes', () => {
  it('clamps to 0..2', () => {
    expect(clampLane(-2)).toBe(0);
    expect(clampLane(5)).toBe(2);
    expect(clampLane(1)).toBe(1);
  });

  it('steps left/right with clamp', () => {
    expect(nextLane(0, -1)).toBe(0);
    expect(nextLane(0, 1)).toBe(1);
    expect(nextLane(2, 1)).toBe(2);
  });
});

describe('swipeToAction', () => {
  it('maps upward swipe to jump', () => {
    expect(swipeToAction(0, -40, 100)).toEqual({ type: 'jump' });
  });

  it('maps horizontal swipe to lane delta', () => {
    expect(swipeToAction(-50, 0, 100)).toEqual({ type: 'lane', delta: -1 });
    expect(swipeToAction(50, 0, 100)).toEqual({ type: 'lane', delta: 1 });
  });

  it('ignores tiny or slow gestures', () => {
    expect(swipeToAction(5, 5, 100).type).toBe('none');
    expect(swipeToAction(100, 0, 2000).type).toBe('none');
  });
});

describe('keyToAction', () => {
  it('maps gameplay keys', () => {
    expect(keyToAction('Space', ' ')).toEqual({ type: 'jump' });
    expect(keyToAction('KeyA', 'a')).toEqual({ type: 'lane', delta: -1 });
    expect(keyToAction('KeyD', 'd')).toEqual({ type: 'lane', delta: 1 });
    expect(keyToAction('ShiftLeft', 'Shift')).toEqual({ type: 'boost' });
  });
});
