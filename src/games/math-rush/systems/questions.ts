import { DIFFICULTIES, type MathDifficultyKey, type MathOp } from '../config';

export interface MathQuestion {
  text: string;
  answer: number;
}

export function randInt(min: number, max: number, rng: () => number = Math.random): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pickFrom<T>(arr: readonly T[], rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function generateQuestion(
  diffKey: MathDifficultyKey,
  rng: () => number = Math.random,
): MathQuestion {
  const cfg = DIFFICULTIES[diffKey];
  const op = pickFrom(cfg.ops, rng) as MathOp;
  let a = randInt(cfg.min, cfg.max, rng);
  let b = randInt(cfg.min, cfg.max, rng);
  if (op === '-') {
    if (b > a) {
      const t = a;
      a = b;
      b = t;
    }
  } else if (op === '*') {
    a = randInt(1, cfg.mulMax, rng);
    b = randInt(1, cfg.mulMax, rng);
  }
  const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
  return { text: `${a} ${op} ${b} = ?`, answer };
}

export function parseGuess(raw: string): number | null {
  const cleaned = raw.trim();
  if (cleaned === '') return null;
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
}

export function isCorrectGuess(guess: number, answer: number): boolean {
  return guess === answer;
}
