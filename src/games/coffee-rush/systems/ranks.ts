import { RANKS, type RankTier } from '../config';

export function rankFor(score: number): RankTier {
  for (const r of RANKS) {
    if (score >= r.min && score <= r.max) return r;
  }
  return RANKS[0];
}
