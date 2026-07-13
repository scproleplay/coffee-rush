/** Coffee Rush constants + data tables. Storage keys stay legacy-compatible. */

export const STORAGE_KEY = 'coffeeRushBestScore';
export const SOUND_KEY = 'coffeeRushSoundOn';
export const ACHIEVEMENTS_KEY = 'coffeeRushAchievements';
export const SHARE_PATH = '/coffee-rush/';

export const GOLDEN_CHANCE = 0.25;
export const COMBO_WINDOW_MS = 900;
export const COMBO_BURST_THRESHOLD = 2;
export const COUNTDOWN_SECONDS = ['3', '2', '1', 'GO!'] as const;

export type DifficultyKey = 'easy' | 'normal' | 'hard' | 'insane';

export interface DifficultyProfile {
  duration: number;
  cupTimeoutMs: number;
  cupSize: string;
  cupBase: number;
  insane: boolean;
  label: string;
}

export const DIFFICULTIES: Record<DifficultyKey, DifficultyProfile> = {
  easy: {
    duration: 60,
    cupTimeoutMs: 2000,
    cupSize: 'size-easy',
    cupBase: 110,
    insane: false,
    label: 'Easy Mode',
  },
  normal: {
    duration: 60,
    cupTimeoutMs: 1500,
    cupSize: '',
    cupBase: 90,
    insane: false,
    label: 'Normal Mode',
  },
  hard: {
    duration: 45,
    cupTimeoutMs: 1100,
    cupSize: 'size-hard',
    cupBase: 70,
    insane: false,
    label: 'Hard Mode',
  },
  insane: {
    duration: 30,
    cupTimeoutMs: 800,
    cupSize: 'size-insane',
    cupBase: 70,
    insane: true,
    label: 'Insane Mode',
  },
};

export interface RankTier {
  min: number;
  max: number;
  name: string;
  emoji: string;
}

export const RANKS: RankTier[] = [
  { min: 0, max: 499, name: 'Beginner Sipper', emoji: '🥛' },
  { min: 500, max: 1499, name: 'Coffee Catcher', emoji: '☕' },
  { min: 1500, max: 2999, name: 'Caffeine Pro', emoji: '⚡' },
  { min: 3000, max: 4999, name: 'Coffee Master', emoji: '👑' },
  { min: 5000, max: Infinity, name: 'Coffee Legend', emoji: '🌟' },
];

export interface GameStats {
  score: number;
  goldenCups: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  test: (g: GameStats) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_sip',
    name: 'First Sip',
    emoji: '☕',
    desc: 'Score 100+',
    test: (g) => g.score >= 100,
  },
  {
    id: 'coffee_catcher',
    name: 'Coffee Catcher',
    emoji: '🥤',
    desc: 'Score 500+',
    test: (g) => g.score >= 500,
  },
  {
    id: 'caffeine_pro',
    name: 'Caffeine Pro',
    emoji: '⚡',
    desc: 'Score 1500+',
    test: (g) => g.score >= 1500,
  },
  {
    id: 'coffee_master',
    name: 'Coffee Master',
    emoji: '👑',
    desc: 'Score 3000+',
    test: (g) => g.score >= 3000,
  },
  {
    id: 'coffee_legend',
    name: 'Coffee Legend',
    emoji: '🌟',
    desc: 'Score 5000+',
    test: (g) => g.score >= 5000,
  },
  {
    id: 'golden_hunter',
    name: 'Golden Hunter',
    emoji: '✨',
    desc: 'Catch 15 golden coffees',
    test: (g) => g.goldenCups >= 15,
  },
];
