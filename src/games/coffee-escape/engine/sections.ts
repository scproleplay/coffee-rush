/**
 * Pure house-journey section timeline (CE-local).
 * Distance is world Z units traveled (accumulated speed * dt).
 */

export type SectionId = 'living' | 'kitchen' | 'hallway' | 'garden';

export const SECTION_ORDER: readonly SectionId[] = [
  'living',
  'kitchen',
  'hallway',
  'garden',
] as const;

/**
 * How long each section lasts in world-scroll units.
 * At BASE_SPEED (~12), 150 units ≈ 12.5s — long enough to read the room.
 */
export const SECTION_LENGTH_Z: Record<SectionId, number> = {
  living: 150,
  kitchen: 150,
  hallway: 130,
  garden: 160,
};

export interface SectionSnapshot {
  id: SectionId;
  /** Which pass through the cycle (0-based). */
  cycleIndex: number;
  /** Index into SECTION_ORDER for this segment. */
  orderIndex: number;
  /** Distance into the current section [0, length). */
  localZ: number;
  /** Section length for current id. */
  lengthZ: number;
  /** 0 → 1 progress through the current section. */
  progress: number;
  /** Absolute distance where this section started. */
  startDistance: number;
}

function cycleLength(): number {
  let sum = 0;
  for (const id of SECTION_ORDER) sum += SECTION_LENGTH_Z[id];
  return sum;
}

const CYCLE_Z = cycleLength();

/**
 * Resolve which house section the player is in for a given travel distance.
 * Distance ≤ 0 always starts in living at the beginning of the cycle.
 */
export function sectionAtDistance(distance: number): SectionSnapshot {
  const d = Math.max(0, distance);
  const cycleIndex = Math.floor(d / CYCLE_Z);
  let local = d - cycleIndex * CYCLE_Z;

  let startDistance = cycleIndex * CYCLE_Z;
  for (let i = 0; i < SECTION_ORDER.length; i++) {
    const id = SECTION_ORDER[i]!;
    const lengthZ = SECTION_LENGTH_Z[id];
    if (local < lengthZ || i === SECTION_ORDER.length - 1) {
      const localZ = Math.min(local, lengthZ - 1e-6);
      return {
        id,
        cycleIndex,
        orderIndex: i,
        localZ,
        lengthZ,
        progress: Math.min(1, Math.max(0, localZ / lengthZ)),
        startDistance,
      };
    }
    local -= lengthZ;
    startDistance += lengthZ;
  }

  // Fallback (should not hit)
  return {
    id: 'living',
    cycleIndex,
    orderIndex: 0,
    localZ: 0,
    lengthZ: SECTION_LENGTH_Z.living,
    progress: 0,
    startDistance: cycleIndex * CYCLE_Z,
  };
}

export function nextSectionId(id: SectionId): SectionId {
  const i = SECTION_ORDER.indexOf(id);
  return SECTION_ORDER[(i + 1) % SECTION_ORDER.length]!;
}

export function sectionLabel(id: SectionId): string {
  switch (id) {
    case 'living':
      return 'Living Room';
    case 'kitchen':
      return 'Kitchen';
    case 'hallway':
      return 'Hallway';
    case 'garden':
      return 'Garden';
  }
}

/** Total length of one full house loop (for strip planning). */
export function sectionCycleLength(): number {
  return CYCLE_Z;
}
