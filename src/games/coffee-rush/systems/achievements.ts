import { ACHIEVEMENTS, type AchievementDef, type GameStats } from '../config';

export function evaluateUnlocks(
  stats: GameStats,
  already: ReadonlySet<string>,
  defs: AchievementDef[] = ACHIEVEMENTS,
): AchievementDef[] {
  const newly: AchievementDef[] = [];
  for (const a of defs) {
    if (!already.has(a.id) && a.test(stats)) newly.push(a);
  }
  return newly;
}

export function loadAchievementIds(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

export function serializeAchievements(set: ReadonlySet<string>): string {
  return JSON.stringify(Array.from(set));
}
