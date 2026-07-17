/**
 * Pure game-flow copy / thresholds (CE-local).
 * House-chase flavor + chase-meter catch titles.
 */

export type FailReason = 'none' | 'crash' | 'caught';

export function pickGameOverTitle(
  score: number,
  failReason: FailReason = 'none',
): string {
  if (failReason === 'caught') return 'He caught his coffee! ☕😱';
  if (score >= 250) return 'House legend! ☕🏠';
  if (score >= 150) return 'Outran the house! ☕💨';
  if (score >= 80) return 'Almost free! ☕✨';
  if (score >= 40) return 'Close call! ☕😅';
  return 'Back to the kitchen… ☕😵';
}

/** Short coaching line under the game-over title. */
export function pickGameOverBlurb(
  score: number,
  failReason: FailReason = 'none',
): string {
  if (failReason === 'caught') {
    return 'The chase meter hit max. Grab caffeine, boost to cool off, and keep jumping clutter.';
  }
  if (score >= 250) {
    return 'You tore through every room. Submit that score — the house won’t forget.';
  }
  if (score >= 150) {
    return 'Great escape! Watch the chase meter and double-jump for high beans next time.';
  }
  if (score >= 80) {
    return 'Solid run. Hit fewer obstacles and sip caffeine when he’s coming.';
  }
  if (score >= 40) {
    return 'You’re learning the house. Jump early, switch lanes, and save boost for tight spots.';
  }
  return 'Warm up lap. Swipe up to jump, again for a steam double-jump — keep the meter green.';
}

export function isNewBest(score: number, best: number): boolean {
  return score > best;
}
