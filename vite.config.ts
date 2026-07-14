import { defineConfig, type Plugin } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.resolve(rootDir, 'pages');

/** Pretty URLs in dev: /coffee-rush/ → /pages/coffee-rush/index.html */
function pagesDevUrls(): Plugin {
  const routes: Record<string, string> = {
    '/': '/pages/index.html',
    '/index.html': '/pages/index.html',
    '/coffee-rush': '/pages/coffee-rush/index.html',
    '/coffee-rush/': '/pages/coffee-rush/index.html',
    '/coffee-escape': '/pages/coffee-escape/index.html',
    '/coffee-escape/': '/pages/coffee-escape/index.html',
    '/reaction-timer': '/pages/reaction-timer/index.html',
    '/reaction-timer/': '/pages/reaction-timer/index.html',
    '/memory-match': '/pages/memory-match/index.html',
    '/memory-match/': '/pages/memory-match/index.html',
    '/math-rush': '/pages/math-rush/index.html',
    '/math-rush/': '/pages/math-rush/index.html',
    '/leaderboard': '/pages/leaderboard/index.html',
    '/leaderboard/': '/pages/leaderboard/index.html',
    '/profile': '/pages/profile/index.html',
    '/profile/': '/pages/profile/index.html',
    '/admin': '/pages/admin/index.html',
    '/admin/': '/pages/admin/index.html',
  };

  return {
    name: 'codecup-pages-dev-urls',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (!req.url) return next();
        const [pathname, qs] = req.url.split('?');
        const mapped = routes[pathname ?? ''];
        if (mapped) {
          req.url = qs ? `${mapped}?${qs}` : mapped;
        }
        next();
      });
    },
  };
}

/**
 * Build emits dist/pages/... by default; flatten to dist/coffee-rush/...
 * so production URLs stay /coffee-rush/ without a /pages/ prefix.
 */
function flattenPagesBuild(): Plugin {
  return {
    name: 'codecup-flatten-pages-build',
    apply: 'build',
    closeBundle() {
      const dist = path.resolve(rootDir, 'dist');
      const nested = path.join(dist, 'pages');
      if (!fs.existsSync(nested)) return;

      const walk = (dir: string) => {
        for (const name of fs.readdirSync(dir)) {
          const from = path.join(dir, name);
          const rel = path.relative(nested, from);
          const to = path.join(dist, rel);
          if (fs.statSync(from).isDirectory()) {
            fs.mkdirSync(to, { recursive: true });
            walk(from);
          } else {
            fs.mkdirSync(path.dirname(to), { recursive: true });
            fs.renameSync(from, to);
          }
        }
      };
      walk(nested);
      fs.rmSync(nested, { recursive: true, force: true });
    },
  };
}

/**
 * Vite multi-page best practice for this monorepo-style arcade:
 *
 * - Project root = Vite root (official default) so /src and /public just work
 * - pages/*.html = HTML entries only (one document per URL)
 * - src/ = all TypeScript, CSS modules, game code
 * - public/ = static files copied as-is
 */
export default defineConfig({
  root: rootDir,
  publicDir: 'public',
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
      '@shared': path.resolve(rootDir, 'src/shared'),
      '@games': path.resolve(rootDir, 'src/games'),
      '@styles': path.resolve(rootDir, 'src/styles'),
    },
  },
  server: {
    port: 5173,
    open: false,
  },
  plugins: [pagesDevUrls(), flattenPagesBuild()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(pagesDir, 'index.html'),
        coffeeEscape: path.resolve(pagesDir, 'coffee-escape/index.html'),
        coffeeRush: path.resolve(pagesDir, 'coffee-rush/index.html'),
        reactionTimer: path.resolve(pagesDir, 'reaction-timer/index.html'),
        memoryMatch: path.resolve(pagesDir, 'memory-match/index.html'),
        mathRush: path.resolve(pagesDir, 'math-rush/index.html'),
        leaderboard: path.resolve(pagesDir, 'leaderboard/index.html'),
        profile: path.resolve(pagesDir, 'profile/index.html'),
        admin: path.resolve(pagesDir, 'admin/index.html'),
      },
    },
    target: 'es2022',
    sourcemap: true,
  },
});
