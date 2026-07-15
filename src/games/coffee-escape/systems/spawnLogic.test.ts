import { describe, expect, it } from 'vitest';
import {
  isKindAvailable,
  isPatternFair,
  nextSpawnDelay,
  pairLanes,
  pairSpawnChance,
  pickKind,
  pickLane,
  pickSpawnPattern,
  pickZ,
  shouldSpawnPair,
} from './spawnLogic';
import { OBSTACLE_KINDS } from '../entities/obstacleKinds';
import { OBSTACLE_START_Z } from '../engine/constants';

/** Deterministic "random" sequence for tests. */
function seq(...values: number[]): () => number {
  let i = 0;
  return () => {
    const v = values[i % values.length]!;
    i += 1;
    return v;
  };
}

describe('isKindAvailable', () => {
  it('blocks wide obstacles early', () => {
    expect(isKindAvailable('table', 0)).toBe(false);
    expect(isKindAvailable('doorframe', 11)).toBe(false);
  });

  it('allows wide obstacles later', () => {
    expect(isKindAvailable('table', 12)).toBe(true);
    expect(isKindAvailable('chair', 0)).toBe(true);
    expect(isKindAvailable('rug', 0)).toBe(true);
  });

  it('blocks taller mid furniture before 8s', () => {
    expect(isKindAvailable('laundry', 5)).toBe(false);
    expect(isKindAvailable('laundry', 8)).toBe(true);
  });
});

describe('pickKind', () => {
  it('returns a known house kind', () => {
    const kind = pickKind(0, seq(0));
    expect(Object.keys(OBSTACLE_KINDS)).toContain(kind);
  });

  it('never returns tall/wide kinds early', () => {
    for (let i = 0; i < 30; i++) {
      const k = pickKind(5, seq(i / 30));
      expect(k).not.toBe('table');
      expect(k).not.toBe('doorframe');
      expect(k).not.toBe('laundry');
    }
  });

  it('lowOnly only returns trip hazards', () => {
    for (let i = 0; i < 15; i++) {
      const k = pickKind(20, seq(i / 15), { lowOnly: true });
      expect(['spill', 'cable', 'rug', 'books', 'toys']).toContain(k);
    }
  });
});

describe('pair spawn', () => {
  it('pair chance ramps and caps', () => {
    expect(pairSpawnChance(0)).toBeCloseTo(0.18, 5);
    expect(pairSpawnChance(100)).toBe(0.42);
  });

  it('never pairs in first 4 seconds', () => {
    expect(shouldSpawnPair(3, seq(0))).toBe(false);
    expect(shouldSpawnPair(4, seq(0))).toBe(false);
  });

  it('can pair after 4s when random is low enough', () => {
    expect(shouldSpawnPair(10, seq(0))).toBe(true);
    expect(shouldSpawnPair(10, seq(0.99))).toBe(false);
  });
});

describe('pickSpawnPattern', () => {
  it('early game uses single or jump_low only', () => {
    for (let i = 0; i < 20; i++) {
      const p = pickSpawnPattern(2, seq(i / 20));
      expect(['single', 'jump_low']).toContain(p);
    }
  });

  it('mid game can use bean / pair patterns', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      seen.add(pickSpawnPattern(15, seq(i / 40, 0.1, 0.2)));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('isPatternFair', () => {
  it('pair must block exactly two lanes', () => {
    expect(isPatternFair('pair', [0, 2])).toBe(true);
    expect(isPatternFair('pair', [0, 1, 2])).toBe(false);
    expect(isPatternFair('single', [1])).toBe(true);
  });
});

describe('pickLane', () => {
  it('avoids the last lane when known', () => {
    const lane = pickLane(1, seq(0));
    expect(lane).not.toBe(1);
    expect([0, 2]).toContain(lane);
  });

  it('can pick any lane when last is unknown', () => {
    const lane = pickLane(-1, seq(0.9));
    expect([0, 1, 2]).toContain(lane);
  });
});

describe('pickZ', () => {
  it('uses start band for first obstacle', () => {
    const z = pickZ(-999, 12, seq(0.5));
    expect(z).toBeLessThanOrEqual(OBSTACLE_START_Z);
    expect(z).toBeGreaterThanOrEqual(OBSTACLE_START_Z - 3);
  });

  it('places later obstacles behind last with speed-based gap', () => {
    const last = -52;
    const speed = 20;
    const z = pickZ(last, speed, seq(0));
    const minGap = Math.max(10, speed * 0.55);
    expect(z).toBeLessThanOrEqual(last - minGap);
  });
});

describe('nextSpawnDelay', () => {
  it('starts near SPAWN_INTERVAL_START and shrinks over time', () => {
    const early = nextSpawnDelay(0, seq(0.5));
    const late = nextSpawnDelay(20, seq(0.5));
    expect(early).toBeGreaterThan(late);
    expect(early).toBeGreaterThan(0.4);
    expect(late).toBeLessThan(0.55);
  });
});

describe('pairLanes', () => {
  it('returns the two non-safe lanes', () => {
    expect(pairLanes(1).sort()).toEqual([0, 2]);
    expect(pairLanes(0).sort()).toEqual([1, 2]);
  });
});
