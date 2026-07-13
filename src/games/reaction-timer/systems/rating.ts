export function formatMs(ms: number | null): string {
  if (ms == null) return '—';
  return `${ms} ms`;
}

export function getRating(ms: number): string {
  if (ms < 200) return 'Lightning Fast ⚡';
  if (ms < 350) return 'Very Fast 🔥';
  if (ms < 500) return 'Good 👍';
  return 'Keep Practicing ☕';
}

export function isNewBest(bestMs: number | null, ms: number): boolean {
  return bestMs == null || ms < bestMs;
}

export function randomWaitMs(
  min: number,
  max: number,
  rng: () => number = Math.random,
): number {
  return min + rng() * (max - min);
}
