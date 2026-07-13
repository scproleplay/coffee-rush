# CodeCup Arcade — Platform

**Production:** https://codecuparcade.com  
**Stack:** Vite 6 + TypeScript + Supabase (scores) + Vercel

## Vision

A multi-game **platform** kids and teens love:

- App shell (home, leaderboard, profile / future auth)
- Game modules with **best engine per title** (Three.js, DOM, later Phaser/Godot if needed)
- Supabase for scores; **auth-ready** identity without rewriting games

## Why each game has an HTML file (Vite)

Vite builds **for the browser**. Every URL needs an HTML document that loads a JS module:

```html
<script type="module" src="/src/games/coffee-rush/main.ts"></script>
```

| Piece | Role |
|-------|------|
| `pages/.../index.html` | Page shell (layout, buttons) |
| `src/games/...` | Game logic (TypeScript) |
| Vite build | Bundles TS → JS into `dist/` |

Players do **not** play “HTML-only” games — HTML is just the entry; logic is in `src/`.

## Layout

```
pages/                   # HTML entries only (one folder per URL)
  index.html             # → /
  coffee-rush/           # → /coffee-rush/
  coffee-escape/
  reaction-timer/
  memory-match/
  math-rush/
  leaderboard/
  profile/
src/                     # all TypeScript + CSS
  shell/                 # home, leaderboard, profile scripts
  shared/                # auth session, leaderboard client, storage, config
  games/                 # per-game modules
  styles/
public/                  # static assets (images)
```

Vite `root` = `pages/` so URLs stay clean. `public/` and `src/` resolve from the repo root.

## Commands

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
npm run preview
npm test
```

## Status

| Surface | Status |
|---------|--------|
| Shell + 5 games + leaderboard + profile | ✅ live |
| Coffee Escape modular runtime (~291 lines) | ✅ |
| Vitest | ✅ |
| Supabase Auth UI | ⏳ next |
| Mobile QA polish | ⏳ ongoing |

## Architecture rules

1. **Game-local first** — only lift to `src/shared/` when 2+ games need it.
2. **Best engine per title** — Three for CE; DOM for Rush/Reaction/Memory/Math.
3. **Auth-ready** — games use shared leaderboard/session APIs.
4. **Preserve storage keys** — never rename localStorage keys below.
5. **Thin HTML + rich src/** — do not put game logic in HTML.

## Storage keys (do not rename)

| Game | Keys |
|------|------|
| Coffee Rush | `coffeeRushBestScore`, `coffeeRushSoundOn`, `coffeeRushAchievements` |
| Reaction Timer | `reactionTimerBestMs` |
| Memory Match | `memoryMatchBestMoves`, `memoryMatchBestMs` |
| Math Rush | `mathRushBestScore` |
| Coffee Escape | `codecup-coffee-escape-best` |
| Guest nick | `codecup-guest-nickname` |

## QA

See [QA.md](./QA.md).

## Next milestones

1. Mobile smoke on production  
2. Supabase Auth + `user_id` on scores  
3. Kid/teen polish (motion, sound, avatars)  
