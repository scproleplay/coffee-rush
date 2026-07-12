import { describe, expect, it } from 'vitest';
import {
  beanRecyclePastCamera,
  canCollectBean,
  isFatalObstacleHit,
  wideBlocksLane,
} from './collisionLogic';

describe('canCollectBean', () => {
  it('requires same lane, near z, and height', () => {
    expect(
      canCollectBean({ beanLane: 1, beanZ: 0.1, playerLane: 1, playerY: 0.5 }),
    ).toBe(true);
    expect(
      canCollectBean({ beanLane: 0, beanZ: 0.1, playerLane: 1, playerY: 0.5 }),
    ).toBe(false);
    expect(
      canCollectBean({ beanLane: 1, beanZ: 2, playerLane: 1, playerY: 0.5 }),
    ).toBe(false);
    expect(
      canCollectBean({ beanLane: 1, beanZ: 0.1, playerLane: 1, playerY: 0.1 }),
    ).toBe(false);
  });
});

describe('isFatalObstacleHit', () => {
  it('kills when blocked, near, and not high enough', () => {
    expect(
      isFatalObstacleHit({
        blocksPlayerLane: true,
        obstacleZ: 0.2,
        playerY: 0,
        clearHeight: 0.5,
      }),
    ).toBe(true);
  });

  it('survives when jumping clear or boost or wrong lane', () => {
    expect(
      isFatalObstacleHit({
        blocksPlayerLane: true,
        obstacleZ: 0.2,
        playerY: 0.8,
        clearHeight: 0.5,
      }),
    ).toBe(false);
    expect(
      isFatalObstacleHit({
        blocksPlayerLane: true,
        obstacleZ: 0.2,
        playerY: 0,
        clearHeight: 0.5,
        invulnerable: true,
      }),
    ).toBe(false);
    expect(
      isFatalObstacleHit({
        blocksPlayerLane: false,
        obstacleZ: 0.2,
        playerY: 0,
        clearHeight: 0.5,
      }),
    ).toBe(false);
  });
});

describe('blocksPlayerLane / wide', () => {
  it('single lane exact match', () => {
    expect(wideBlocksLane(2, 2, false)).toBe(true);
    expect(wideBlocksLane(2, 1, false)).toBe(false);
  });

  it('wide covers primary and neighbor', () => {
    // lane 1 wide → covers 0 and 2? runtime: [lane-1, lane+1] => [0,2]
    expect(wideBlocksLane(1, 0, true)).toBe(true);
    expect(wideBlocksLane(1, 2, true)).toBe(true);
    expect(wideBlocksLane(1, 1, true)).toBe(false);
    // lane 0 wide → [0, 1]
    expect(wideBlocksLane(0, 0, true)).toBe(true);
    expect(wideBlocksLane(0, 1, true)).toBe(true);
    expect(wideBlocksLane(0, 2, true)).toBe(false);
  });
});

describe('beanRecyclePastCamera', () => {
  it('recycles past threshold', () => {
    expect(beanRecyclePastCamera(7)).toBe(true);
    expect(beanRecyclePastCamera(0)).toBe(false);
  });
});
