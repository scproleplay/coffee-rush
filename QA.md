# Platform QA checklist (`platform/vite-migration`)

Do **not** merge to `main` until this is green on desktop + a real phone.

## Automated (run before every push)

```bash
npm test
npm run build
npm run dev   # then open http://localhost:5173
```

## Routes (all must load, no console errors)

| Route | Check |
|-------|--------|
| `/` | 5 platform cards, links work |
| `/coffee-rush/` | Welcome + difficulty + Start |
| `/reaction-timer/` | Tap to start / wait / result |
| `/memory-match/` | Grid flips, win screen |
| `/math-rush/` | Difficulty, questions, keypad |
| `/coffee-escape/` | Start → 3D run, jump/lanes/boost |
| `/leaderboard/` | Tabs load (network OK) |
| `/profile/` | Guest nickname save |

## Coffee Escape (flagship)

- [ ] Start overlay visible on load  
- [ ] Start Running begins score tick  
- [ ] A/D or swipe changes lanes  
- [ ] Space / swipe up jumps  
- [ ] Shift / BOOST with meter  
- [ ] Collision ends run; game-over + title  
- [ ] Best score persists after refresh  
- [ ] Leaderboard nickname submit (if Supabase up)  
- [ ] Mobile: JUMP/BOOST buttons work  

## DOM games

- [ ] Coffee Rush: combo + golden + best score keys unchanged  
- [ ] Reaction: too-soon / best ms  
- [ ] Memory: best moves/time  
- [ ] Math: wrong-answer retry window  

## Storage keys (must not change)

See `PLATFORM.md` table — `coffeeRushBestScore`, `reactionTimerBestMs`, etc.

## After QA

1. Fix any failures on the branch  
2. Open PR: `platform/vite-migration` → `main`  
3. Deploy via Vercel; smoke `codecuparcade.com`  
