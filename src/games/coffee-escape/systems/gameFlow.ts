/**
 * Pure game-flow copy / thresholds (CE-local).
 * Phase 1 house-chase flavor — still score-only titles (no chase mechanics).
 */

export function pickGameOverTitle(score: number): string {
  if (score >= 200) return 'House legend! ☕🏠';
  if (score >= 100) return 'Almost free! ☕💨';
  if (score >= 50) return 'He almost had you! ☕😱';
  return 'Caught in the house! ☕😵';
}

export function isNewBest(score: number, best: number): boolean {
  return score > best;
}
