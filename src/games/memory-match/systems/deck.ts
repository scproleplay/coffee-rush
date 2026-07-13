/** Fisher–Yates shuffle. Mutates and returns the array. */
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export function buildDeck(symbols: readonly string[], rng: () => number = Math.random): string[] {
  return shuffle([...symbols, ...symbols], rng);
}

export function isMatch(a: string | null, b: string | null): boolean {
  return !!a && !!b && a === b;
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatMs(ms: number | null): string {
  if (ms == null) return '—';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

export function isBetterMoves(best: number | null, moves: number): boolean {
  return best == null || moves < best;
}

export function isBetterTime(best: number | null, ms: number): boolean {
  return best == null || ms < best;
}
