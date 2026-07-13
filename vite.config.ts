import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Multi-page app with HTML under pages/ (clean repo root).
 *
 * - Dev server root is pages/, so /coffee-rush/ maps naturally.
 * - /src and /public are served via aliases + publicDir from repo root.
 * - Build outputs flat dist/coffee-rush/index.html (not dist/pages/...).
 */
export default defineConfig({
  root: path.resolve(rootDir, 'pages'),
  publicDir: path.resolve(rootDir, 'public'),
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
      '@shared': path.resolve(rootDir, 'src/shared'),
      '@games': path.resolve(rootDir, 'src/games'),
      '@styles': path.resolve(rootDir, 'src/styles'),
      // Allow absolute /src/... script tags in HTML
      '/src': path.resolve(rootDir, 'src'),
    },
  },
  server: {
    port: 5173,
    open: false,
    fs: {
      // Allow importing from repo-root src/ outside pages/
      allow: [rootDir],
    },
  },
  build: {
    outDir: path.resolve(rootDir, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(rootDir, 'pages/index.html'),
        coffeeEscape: path.resolve(rootDir, 'pages/coffee-escape/index.html'),
        coffeeRush: path.resolve(rootDir, 'pages/coffee-rush/index.html'),
        reactionTimer: path.resolve(rootDir, 'pages/reaction-timer/index.html'),
        memoryMatch: path.resolve(rootDir, 'pages/memory-match/index.html'),
        mathRush: path.resolve(rootDir, 'pages/math-rush/index.html'),
        leaderboard: path.resolve(rootDir, 'pages/leaderboard/index.html'),
        profile: path.resolve(rootDir, 'pages/profile/index.html'),
      },
    },
    target: 'es2022',
    sourcemap: true,
  },
});
