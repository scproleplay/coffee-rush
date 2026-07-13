export const STORAGE_KEY = 'mathRushBestScore';
export const SHARE_PATH = '/math-rush/';
export const GAME_DURATION_SEC = 60;
export const WRONG_RETRY_MS = 2500;
export const CORRECT_FEEDBACK_MS = 400;

export type MathDifficultyKey = 'easy' | 'normal' | 'hard';
export type MathOp = '+' | '-' | '*';

export interface MathDifficulty {
  label: string;
  ops: MathOp[];
  min: number;
  max: number;
  points: number;
  mulMax: number;
}

export const DIFFICULTIES: Record<MathDifficultyKey, MathDifficulty> = {
  easy: { label: 'Easy Mode', ops: ['+', '-'], min: 1, max: 20, points: 1, mulMax: 0 },
  normal: {
    label: 'Normal Mode',
    ops: ['+', '-', '*'],
    min: 1,
    max: 50,
    points: 2,
    mulMax: 12,
  },
  hard: {
    label: 'Hard Mode',
    ops: ['+', '-', '*'],
    min: 1,
    max: 100,
    points: 3,
    mulMax: 12,
  },
};
