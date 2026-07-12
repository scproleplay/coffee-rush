/**
 * Pure game-flow copy / thresholds (CE-local).
 */

export function pickGameOverTitle(score: number): string {
  if (score >= 200) return 'Legendary Espresso! ☕👑';
  if (score >= 100) return 'What a brew-tal run! ☕💨';
  if (score >= 50) return 'Caught! ☕😱';
  return 'Spat out! ☕😵';
}

export function isNewBest(score: number, best: number): boolean {
  return score > best;
}
