# CodeCup Arcade ☕⚡

A small collection of browser games by CodeCup Studio.

## Games

Platform paths (Vite multi-page app on branch `platform/vite-migration`):

- Coffee Rush ☕ — `/coffee-rush/`
- Reaction Timer ⚡ — `/reaction-timer/`
- Memory Match 🧠 — `/memory-match/`
- Math Rush ➕ — `/math-rush/`
- Coffee Escape ☕🏃 — `/coffee-escape/`

Production site (legacy HTML until merge/deploy):
https://codecuparcade.com/

Local platform:

```bash
npm install
npm run dev
```

## Global Leaderboard 🌍

Each game has a global top-100 leaderboard. After finishing a game, enter a nickname (1–12 characters, no other personal info is collected) and submit. Your best result will appear in the list.

Leaderboard page:
https://codecuparcade.com/leaderboard/

Sort rules:
- Coffee Rush — highest score wins.
- Reaction Timer — lowest reaction time wins.
- Memory Match — lowest moves wins; tie-break on lowest time.
- Math Rush — highest score wins.

## Coffee Rush

Click or tap the coffee cup before it disappears.

- Normal coffee gives +1 point.
- Golden coffee gives +5 points.
- Build combos by catching coffees quickly.
- If you miss a coffee, your combo resets.
- Try different difficulty modes.

### Difficulty Modes

- Easy: 60 seconds, big cup
- Normal: 60 seconds, normal cup
- Hard: 45 seconds, small cup
- Insane: 30 seconds, tiny and fast

### Achievements

- First Sip ☕ — score 100+
- Coffee Catcher 🥤 — score 500+
- Caffeine Pro ⚡ — score 1500+
- Coffee Master 👑 — score 3000+
- Coffee Legend 🌟 — score 5000+
- Golden Hunter ✨ — catch 15 golden coffees in one game

### Features

- Difficulty modes
- Golden coffee
- Combo system
- Achievements
- Best score saving
- Share score button
- Sound toggle
- Support button

## Reaction Timer

- Click "Tap to Start" and wait for the screen to turn green.
- Click as fast as you can after green appears.
- Best reaction time is saved in your browser.
- Clicking before green counts as a miss.

### Reaction Ratings

- Under 200 ms: Lightning Fast ⚡
- 200-349 ms: Very Fast 🔥
- 350-499 ms: Good 👍
- 500+ ms: Keep Practicing ☕

### Features

- Personal best tracking
- Share score button
- Reset best button
- Sound toggle
- Support button

## Memory Match

- A 4x4 grid of cards with 8 matching pairs.
- Click any card to start the timer and reveal it.
- Click a second card to make a guess.
- Matching pairs stay revealed. Non-matching pairs flip back after a moment.
- Match all 8 pairs to win.
- Best moves and best time are saved in your browser.

### Features

- Move counter
- Timer
- Best moves and best time tracking
- Try Again button
- Back to Arcade button
- Reset best button
- Support button

## Math Rush

- A 60-second math challenge. Solve as many problems as you can.
- Questions use addition, subtraction, and multiplication.
- Type or tap your answer, then press Enter or ✓.
- Wrong answers can be corrected within 2.5 seconds before the game moves on.
- Best score is saved in your browser.

### Difficulty Modes

- Easy: addition and subtraction, numbers 1–20, +1 point per correct
- Normal: addition, subtraction, and multiplication, numbers 1–50, +2 points per correct
- Hard: addition, subtraction, and multiplication, numbers 1–100, +3 points per correct

### Features

- Difficulty modes
- 60-second timer
- Score, correct, and wrong counters
- Best score saving
- Share score button
- Try Again button
- Main Menu button
- Reset best button
- Support button
- On-screen numeric keypad for mobile

## Coffee Escape

A 2D endless runner set inside a house. You play a freshly poured cup of
coffee that has to sprint away from a tired man who just walked in
looking for his caffeine.

### How to play

- The cup runs automatically from left to right.
- Press **Space** or **↑** on desktop to jump.
- Tap anywhere on the play area (or use the on-screen JUMP button) on
  mobile.
- Jump over chairs, tables, sofas, lamps, and boxes that scroll in from
  the right.
- Speed slowly increases the longer you survive.
- Best score is saved in your browser.

### Features

- Original 2D endless runner
- Animated 5-scene cartoon intro cutscene (HTML/CSS/JS shapes — no
  external video, no copyrighted assets)
- Coffee cup with stick arms, stick legs, and four facial expressions:
  normal (menus), scared (running), shocked (near obstacles, game
  over), and happy (after the man trips)
- Tired middle-aged man chases in the background with a real running
  animation, expressive eyes, and a reaching hand
- The man sometimes trips on a chair/table the player just dodged
  — he shows X-eyes, a tilted body, an "Oof!" speech bubble, and
  stars around his head; the cup is happy for a moment, gets a
  small score bonus, and the next 2 obstacles arrive later
- House-themed background (wallpaper, window, picture, clock, wood
  floor)
- Five furniture obstacle types
- Start screen, HUD, and game over screen
- Best score saving
- Try Again, Back to Arcade, Play Intro, and Skip Intro buttons
- Support CodeCup Studio button
- Mobile-friendly with on-screen JUMP button
- Reset best score button

### Status

Coffee Escape is **temporarily public** (auto-reverts to "Coming
soon" in 2 hours). To publish permanently, change the Coffee Escape
`<li>` in `index.html` back to a normal playable card (the current
state) and stop the scheduled revert.

## Support

If you enjoy these games, you can support CodeCup Studio here:

https://www.buymeacoffee.com/sunboys

Support helps future games and updates.

## Versions

- CodeCup Arcade v1.2
- Coffee Rush v1.1
- Reaction Timer v1.0
- Memory Match v1.0
- Math Rush v1.0
- Coffee Escape v1.1
- Leaderboard v1.0
