# CodeCup Arcade — Platform

**Production:** https://codecuparcade.com  
**Stack:** Vite 6 + TypeScript + Supabase (scores) + Vercel

## Vite best-practice layout (what we use)

```
codecup-arcade/                 # Vite project root
├── pages/                      # HTML entries ONLY (one page per URL)
│   ├── index.html              # → /
│   ├── coffee-rush/index.html  # → /coffee-rush/
│   ├── coffee-escape/
│   ├── reaction-timer/
│   ├── memory-match/
│   ├── math-rush/
│   ├── leaderboard/
│   └── profile/
├── src/                        # ALL application code
│   ├── shell/                  # home / leaderboard / profile scripts
│   ├── shared/                 # auth, leaderboard client, storage, config
│   ├── games/                  # per-game modules (logic, not HTML)
│   ├── styles/
│   └── vite-env.d.ts
├── public/                     # static assets (copied as-is to dist/)
├── package.json
├── vite.config.ts
├── tsconfig.json
├── vitest.config.ts
└── vercel.json
```

### Why HTML files exist

Vite builds **for the browser**. Every URL needs an HTML document that loads a module:

```html
<script type="module" src="/src/games/coffee-rush/main.ts"></script>
```

| Folder | Role |
|--------|------|
| `pages/` | Page shell only (markup, buttons) |
| `src/` | Real logic (TypeScript) |
| `public/` | Images / static files |
| `dist/` | Build output (gitignored) |

This matches Vite’s multi-page app model: **HTML entries + `src` modules**, with the project root as Vite’s root so `/src/...` and `/public` resolve naturally.

### Rules

1. **Game-local first** — put code in `src/games/<id>/` until 2+ games need it, then `src/shared/`.
2. **No game logic in HTML** — only structure + one module script tag.
3. **Best engine per title** — Three.js for Escape; DOM for the rest (Phaser/Godot later if needed).
4. **Auth-ready** — use `src/shared` leaderboard/session APIs.
5. **Never rename** localStorage keys (see table below).

## Commands

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
npm test
```

## Status

| Surface | Status |
|---------|--------|
| Shell + 5 games + leaderboard + profile | ✅ live |
| Vite pages/ + src/ layout | ✅ |
| Coffee Escape modular runtime | ✅ |
| Vitest | ✅ |
| Supabase Auth UI | ⏳ next |

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

## Supabase leaderboard

- Table: `public.leaderboard_scores` (RLS on; anon SELECT allowed).
- Env (Vercel + local `.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Correct project host: `https://lsvctdcydndfdncbvneq.supabase.co` (watch for typo `…nddf…`).
- Coffee Escape guest **inserts** need SQL: `supabase/fix_coffee_escape_insert_policy.sql` (run in SQL Editor once).

## Auth MVP (magic link)

Configure in Supabase Dashboard (see also `supabase/auth_profiles_mvp.sql`):

| Setting | Value |
|---------|--------|
| Site URL | `https://codecuparcade.com` |
| Redirect URLs | `https://codecuparcade.com/profile/**`, `http://localhost:5173/profile/**` |
| Email | Enable Email provider + magic link |

App: optional login on `/profile/`; guests still play; scores attach `user_id` when signed in.

## Next milestones

1. Mobile smoke on production  
2. Supabase Auth + `user_id` on scores  
3. Kid/teen polish (motion, sound, avatars)  
