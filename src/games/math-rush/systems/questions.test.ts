import { describe, expect, it } from 'vitest';
import { generateQuestion, isCorrectGuess, parseGuess, randInt } from './questions';

describe('math-rush questions', () => {
  it('parses guesses', () => {
    expect(parseGuess('')).toBeNull();
    expect(parseGuess('42')).toBe(42);
    expect(isCorrectGuess(4, 4)).toBe(true);
    expect(isCorrectGuess(3, 4)).toBe(false);
  });

  it('generates with fixed rng', () => {
    // with rng always 0: op = ops[0] = '+', a=min, b=min → 1+1
    const q = generateQuestion('easy', () => 0);
    expect(q.text).toBe('1 + 1 = ?');
    expect(q.answer).toBe(2);
    expect(randInt(1, 1, () => 0)).toBe(1);
  });
});
