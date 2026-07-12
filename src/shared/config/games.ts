/**
 * Registry of every CodeCup game.
 * Auth, leaderboards, home shell, and future seasons all read from here.
 * Adding a game = one entry + a module under src/games — not a new architecture.
 */
export type GameEngine = 'three' | 'phaser' | 'pixi' | 'dom' | 'godot' | 'unity';

export type GameId =
  | 'coffee-rush'
  | 'reaction-timer'
  | 'memory-match'
  | 'math-rush'
  | 'coffee-escape';

export interface GameDefinition {
  id: GameId;
  name: string;
  emoji: string;
  tagline: string;
  /** Public path once migrated into the Vite app */
  href: string;
  /** Legacy static path during migration (public/legacy) */
  legacyHref?: string;
  engine: GameEngine;
  /** true when the Vite/TS module is the live entry */
  platformReady: boolean;
  featured?: boolean;
  accent: string;
}

export const GAMES: GameDefinition[] = [
  {
    id: 'coffee-rush',
    name: 'Coffee Rush',
    emoji: '☕',
    tagline: 'Catch coffee cups before time runs out.',
    href: '/legacy/coffee-rush.html',
    legacyHref: '/legacy/coffee-rush.html',
    engine: 'dom',
    platformReady: false,
    featured: true,
    accent: '#ff5a1f',
  },
  {
    id: 'reaction-timer',
    name: 'Reaction Timer',
    emoji: '⚡',
    tagline: 'Wait for green, then tap as fast as you can.',
    href: '/legacy/reaction-timer.html',
    engine: 'dom',
    platformReady: false,
    accent: '#ffb000',
  },
  {
    id: 'memory-match',
    name: 'Memory Match',
    emoji: '🧠',
    tagline: 'Match all pairs in as few moves as possible.',
    href: '/legacy/memory-match.html',
    engine: 'dom',
    platformReady: false,
    accent: '#7c5cff',
  },
  {
    id: 'math-rush',
    name: 'Math Rush',
    emoji: '➕',
    tagline: 'Solve as many problems as you can in 60 seconds.',
    href: '/legacy/math-rush.html',
    engine: 'dom',
    platformReady: false,
    accent: '#2ecc71',
  },
  {
    id: 'coffee-escape',
    name: 'Coffee Escape',
    emoji: '☕🏃',
    tagline: 'Sprint the hallway. Jump. Boost. Don’t get caught.',
    href: '/coffee-escape/',
    engine: 'three',
    platformReady: true,
    accent: '#ff8800',
  },
];

export function getGame(id: GameId): GameDefinition {
  const g = GAMES.find((x) => x.id === id);
  if (!g) throw new Error(`Unknown game: ${id}`);
  return g;
}
