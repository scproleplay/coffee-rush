/**
 * Personal best helpers (local). When auth ships, cloud bests layer on top —
 * same API shape, extra userId channel.
 */
export function loadBest(storageKey: string): number {
  try {
    const v = parseInt(localStorage.getItem(storageKey) || '0', 10);
    return Number.isFinite(v) && v > 0 ? v : 0;
  } catch {
    return 0;
  }
}

export function saveBest(storageKey: string, value: number): number {
  const n = Math.max(0, Math.floor(value));
  try {
    localStorage.setItem(storageKey, String(n));
  } catch {
    /* private mode / quota */
  }
  return n;
}

export function updateBestIfHigher(storageKey: string, score: number): {
  best: number;
  isNewBest: boolean;
} {
  const prev = loadBest(storageKey);
  if (score > prev) {
    const best = saveBest(storageKey, score);
    return { best, isNewBest: true };
  }
  return { best: prev, isNewBest: false };
}
