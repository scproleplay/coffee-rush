import { COMBO_WINDOW_MS, GOLDEN_CHANCE } from '../config';

/** Next combo after a successful click at `now` vs previous click time. */
export function nextCombo(prevCombo: number, lastClickAt: number, now: number): number {
  if (lastClickAt && now - lastClickAt <= COMBO_WINDOW_MS) {
    return prevCombo + 1;
  }
  return 1;
}

export function basePoints(isGolden: boolean): number {
  return isGolden ? 5 : 1;
}

export function totalPoints(isGolden: boolean, combo: number): number {
  return basePoints(isGolden) * Math.max(1, combo);
}

/** Whether this spawn is golden. Inject RNG for tests. */
export function rollGolden(chance: number = GOLDEN_CHANCE, rng: () => number = Math.random): boolean {
  return rng() < chance;
}
