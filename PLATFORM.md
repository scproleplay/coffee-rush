# CodeCup Arcade — Platform Migration

**Branch:** `platform/vite-migration`  
**Rule:** Do not merge to `main` until migration is validated.

## Vision

A real multi-game **platform** kids and teens love:

- App shell (home, leaderboard, future auth/profile)
- Game modules with **best engine per title** (Three.js, Phaser/Pixi, Godot/Unity when needed)
- Supabase for scores now; **Auth + per-user identity** without rewriting games

## Stack

| Layer | Choice |
|-------|--------|
| Build | Vite 6 + TypeScript |
| 3D | Three.js (ES modules) |
| DOM games | Typed modules + shared chrome CSS |
| Backend | Supabase (anon key via `VITE_*` env) |
| Deploy | Vercel (`dist/`) — only after merge |

## Commands

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
npm run preview
npm run typecheck
npm test           # Vitest unit tests
npm run test:watch
```

## Layout

```
src/
  shell/                 # homepage + leaderboard UI
  shared/
    auth/                # session contracts (guest now, login later)
    leaderboard/         # typed Supabase client
    storage/             # local best scores
    config/              # game registry, env
    ui/
  games/
    coffee-escape/       # Three.js endless runner
    coffee-rush/         # DOM clicker
    reaction-timer/
    memory-match/
    math-rush/
  styles/                # tokens, shell, legacy-arcade.css
public/legacy/           # rollback static copies
coffee-escape/index.html
coffee-rush/index.html
reaction-timer/index.html
memory-match/index.html
math-rush/index.html
leaderboard/index.html
index.html
```

## Migration status

| Surface | Status |
|---------|--------|
| Vite + TS scaffold | ✅ |
| Shell homepage | ✅ |
| Leaderboard page | ✅ |
| Auth contracts (guest) | ✅ ready for Phase B login |
| Coffee Escape (Three.js) | ✅ platform citizen |
| Coffee Rush | ✅ platform module |
| Reaction Timer | ✅ platform module |
| Memory Match | ✅ platform module |
| Math Rush | ✅ platform module |
| Profile page (guest nickname) | ✅ stub — auth-ready |
| Supabase Auth UI | ⏳ Phase C |
| Merge to main | ❌ blocked until mobile QA |

## QA

See [QA.md](./QA.md) for the pre-merge checklist (desktop + mobile).

## Next milestones

1. Mobile smoke QA on all five games + shell  
2. Supabase Auth + `user_id` on scores  
3. Kid/teen visual polish pass (motion, sound, avatars)  
4. Optional: retire `public/legacy/` or add old-URL redirects  
5. Merge `platform/vite-migration` → `main` after QA  

## Storage keys (do not rename)

| Game | Keys |
|------|------|
| Coffee Rush | `coffeeRushBestScore`, `coffeeRushSoundOn`, `coffeeRushAchievements` |
| Reaction Timer | `reactionTimerBestMs` |
| Memory Match | `memoryMatchBestMoves`, `memoryMatchBestMs` |
| Math Rush | `mathRushBestScore` |
| Coffee Escape | (see CE constants) |
| Guest nick | `codecup-guest-nickname` |

## Architecture rules (do not violate)

1. **Game-local first** — only lift to `src/shared/` when 2+ games truly need the same contract.
2. **Best engine per title** — Three.js for CE; DOM modules for Rush/Reaction/Memory/Math (no forced Phaser rewrite).
3. **Auth-ready** — games call shared leaderboard/session APIs; login plugs into shell later without game rewrites.
4. **Preserve player data** — never rename localStorage keys (see table above).
5. **One vertical slice at a time** — extract → test → wire → build → smoke; do not break other games.
6. **No merge to `main`** until mobile QA on all five games + shell.

## Coffee Escape module layout (reference pattern)

```
src/games/coffee-escape/
  engine/     constants, scene, hallway, textures, fxPools, types
  entities/   cup, man, bean, decor, obstacles
  systems/    pure rules + Vitest tests (spawn, input, pacing, motion, collision, gameFlow)
  ui/         domRefs
  runtime.ts  orchestration loop (still large — see below)
  main.ts     entry
```

## Why `runtime.ts` can still be large

TypeScript does **not** require one file. A big runtime is normal while it owns:

1. Game loop orchestration (`update` / `render` / `rAF`)
2. Mutable run state (player, pools, timers)
3. DOM event wiring
4. Engine object mutation each frame

### Preferred split pattern

| Kind | Where | Style |
|------|--------|--------|
| Pure rules (testable) | `systems/*.ts` | functions |
| Mesh / DOM builders | `entities/*`, `engine/*` | factories |
| DOM lookup | `ui/domRefs.ts` | one refs object |
| Orchestration | `runtime.ts` (optional later `Game` class for lifecycle only) | thin wire-up |

**Classes are optional** — factories + pure functions + thin orchestrator preferred over deep OOP.

### Target for CE runtime

```
runtime.ts   < ~400 lines eventually
systems/*    pure + tested
entities/*   builders
engine/*     scene, hallway, fx
ui/*         dom
```

DOM games (Rush etc.) follow the same idea at smaller scale: `config` + `systems/*` (tested) + `runtime` + `main`.

### CE runtime progress

| Slice | Status |
|-------|--------|
| Pure systems + tests | ✅ |
| Entities + scene/hallway/fx | ✅ |
| `inputController` + pointer gestures | ✅ |
| `obstaclePool` | ✅ |
| `updateFrame` / `renderFrame` | ✅ |
| `spawnController` + lifecycle UI | ✅ |
| runtime size | **~291 lines** (under 400 target) |
