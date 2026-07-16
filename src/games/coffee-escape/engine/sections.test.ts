import { describe, expect, it } from 'vitest';
import {
  SECTION_LENGTH_Z,
  SECTION_ORDER,
  nextSectionId,
  sectionAtDistance,
  sectionCycleLength,
  sectionLabel,
} from './sections';

describe('sectionAtDistance', () => {
  it('starts in living at distance 0', () => {
    const s = sectionAtDistance(0);
    expect(s.id).toBe('living');
    expect(s.orderIndex).toBe(0);
    expect(s.cycleIndex).toBe(0);
    expect(s.progress).toBe(0);
  });

  it('stays in living until its length', () => {
    const mid = sectionAtDistance(SECTION_LENGTH_Z.living * 0.5);
    expect(mid.id).toBe('living');
    expect(mid.progress).toBeCloseTo(0.5, 5);

    const justBefore = sectionAtDistance(SECTION_LENGTH_Z.living - 0.01);
    expect(justBefore.id).toBe('living');
  });

  it('enters kitchen after living', () => {
    const s = sectionAtDistance(SECTION_LENGTH_Z.living + 1);
    expect(s.id).toBe('kitchen');
    expect(s.orderIndex).toBe(1);
  });

  it('walks living → kitchen → hallway → garden', () => {
    let d = 0;
    const seen: string[] = [];
    for (const id of SECTION_ORDER) {
      const s = sectionAtDistance(d + 1);
      seen.push(s.id);
      d += SECTION_LENGTH_Z[id];
    }
    expect(seen).toEqual([...SECTION_ORDER]);
  });

  it('wraps into a new cycle after full loop', () => {
    const cycle = sectionCycleLength();
    const s = sectionAtDistance(cycle + 5);
    expect(s.id).toBe('living');
    expect(s.cycleIndex).toBe(1);
  });

  it('clamps negative distance to living start', () => {
    const s = sectionAtDistance(-10);
    expect(s.id).toBe('living');
    expect(s.localZ).toBe(0);
  });
});

describe('nextSectionId / labels', () => {
  it('cycles order', () => {
    expect(nextSectionId('living')).toBe('kitchen');
    expect(nextSectionId('garden')).toBe('living');
  });

  it('labels are human-readable', () => {
    expect(sectionLabel('garden')).toBe('Garden');
    expect(sectionLabel('hallway')).toBe('Hallway');
  });
});
