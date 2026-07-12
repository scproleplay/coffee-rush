import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(fileURLToPath(import.meta.url));

// Multi-page app: shell + each game + leaderboard.
// Auth/profile pages will join this list later without rewriting games.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
      '@shared': path.resolve(root, 'src/shared'),
      '@games': path.resolve(root, 'src/games'),
      '@styles': path.resolve(root, 'src/styles'),
    },
  },
  server: {
    port: 5173,
    open: false,
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(root, 'index.html'),
        coffeeEscape: path.resolve(root, 'coffee-escape/index.html'),
        leaderboard: path.resolve(root, 'leaderboard/index.html'),
        profile: path.resolve(root, 'profile/index.html'),
      },
    },
    target: 'es2022',
    sourcemap: true,
  },
});
