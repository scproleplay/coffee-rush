/**
 * Pure game-flow copy / thresholds (CE-local).
 * House-chase flavor + tired-man catch titles.
 */

export type FailReason = 'none' | 'crash' | 'caught';

export function pickGameOverTitle(
  score: number,
  failReason: FailReason = 'none',
): string {
  if (failReason === 'caught') return 'He caught his coffee! ☕😱';
  if (score >= 200) return 'House legend! ☕🏠';
  if (score >= 100) return 'Almost free! ☕💨';
  if (score >= 50) return 'He almost had you! ☕😱';
  return 'Caught in the house! ☕😵';
}

export function isNewBest(score: number, best: number): boolean {
  return score > best;
}
