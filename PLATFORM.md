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
| Backend | Supabase (anon key via `VITE_*` env) |
| Deploy | Vercel (`dist/`) — only after merge |

## Commands

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
npm run preview
npm run typecheck
npm test           # Vitest unit tests (TDD for pure CE/shared logic)
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
    coffee-escape/       # first platform citizen (Three.js)
  styles/                # design tokens + shell chrome
public/legacy/           # not-yet-migrated games (static)
coffee-escape/index.html
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
| Coffee Escape module | ✅ Phase B split started |
| CE `engine/constants`, `engine/textures`, `engine/types` | ✅ |
| CE `entities/obstacleKinds`, `buildObstacleMeshes` | ✅ |
| CE `entities/cup`, `man`, `bean` (game-local only) | ✅ |
| CE `systems/spawnLogic` + `inputLogic` (pure, tested) | ✅ |
| Vitest harness (`npm test`) | ✅ 25 tests |
| Profile page (guest nickname) | ✅ stub — auth-ready |
| Coffee Rush / others | ⏳ legacy under `/legacy/` |
| Supabase Auth UI | ⏳ Phase C |
| Merge to main | ❌ blocked until QA |

## Next milestones

1. Continue CE split: cup/man entities, input/spawn/update systems, remove `@ts-nocheck`  
2. Migrate Coffee Rush (Phaser or polished canvas module)  
3. Supabase Auth + `user_id` on scores (profile already exists)  
4. Kid/teen visual pass (motion, sound, avatars)  
5. QA on mobile → merge `platform/vite-migration` → `main`
