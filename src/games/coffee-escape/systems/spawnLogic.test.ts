import { describe, expect, it } from 'vitest';
import {
  isKindAvailable,
  nextSpawnDelay,
  pairLanes,
  pairSpawnChance,
  pickKind,
  pickLane,
  pickZ,
  shouldSpawnPair,
} from './spawnLogic';
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
  it('blocks tall obstacles before 12s', () => {
    expect(isKindAvailable('watercooler', 0)).toBe(false);
    expect(isKindAvailable('filingcabinet', 11.9)).toBe(false);
  });

  it('allows tall obstacles at 12s+', () => {
    expect(isKindAvailable('watercooler', 12)).toBe(true);
    expect(isKindAvailable('chair', 0)).toBe(true);
  });
});

describe('pickKind', () => {
  it('returns a known kind', () => {
    const kind = pickKind(0, seq(0));
    expect(typeof kind).toBe('string');
    expect(kind.length).toBeGreaterThan(0);
  });

  it('never returns tall kinds early even with high random', () => {
    // Many rolls early game
    for (let i = 0; i < 20; i++) {
      const k = pickKind(5, seq(i / 20));
      expect(k).not.toBe('watercooler');
      expect(k).not.toBe('filingcabinet');
    }
  });
});

describe('pair spawn', () => {
  it('pair chance ramps and caps at 0.45', () => {
    expect(pairSpawnChance(0)).toBeCloseTo(0.15, 5);
    expect(pairSpawnChance(100)).toBe(0.45);
  });

  it('never pairs in first 6 seconds', () => {
    expect(shouldSpawnPair(5, seq(0))).toBe(false);
    expect(shouldSpawnPair(6, seq(0))).toBe(false);
  });

  it('can pair after 6s when random is low enough', () => {
    expect(shouldSpawnPair(10, seq(0))).toBe(true);
    expect(shouldSpawnPair(10, seq(0.99))).toBe(false);
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
    expect(z).toBeGreaterThanOrEqual(OBSTACLE_START_Z - 4);
  });

  it('places later obstacles behind last with speed-based gap', () => {
    const last = -70;
    const speed = 20;
    const z = pickZ(last, speed, seq(0));
    const minGap = Math.max(6, speed * 0.4);
    expect(z).toBeLessThanOrEqual(last - minGap);
  });
});

describe('nextSpawnDelay', () => {
  it('starts near SPAWN_INTERVAL_START and shrinks over time', () => {
    const early = nextSpawnDelay(0, seq(0.5));
    const late = nextSpawnDelay(25, seq(0.5));
    expect(early).toBeGreaterThan(late);
    expect(early).toBeGreaterThan(0.5);
    expect(late).toBeLessThan(0.7);
  });
});

describe('pairLanes', () => {
  it('returns the two non-safe lanes', () => {
    expect(pairLanes(1).sort()).toEqual([0, 2]);
    expect(pairLanes(0).sort()).toEqual([1, 2]);
  });
});
