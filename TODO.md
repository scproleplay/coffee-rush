# CodeCup Arcade TODO

## Bugs to check
- Test each game on mobile
- Test all difficulty modes (Coffee Rush, Math Rush)
- Test the sound button (Coffee Rush)
- Test the Support CodeCup Studio button on every page
- Confirm share text URLs are correct on every game:
  - Coffee Rush: https://codecup-coffee-rush.netlify.app/coffee-rush.html
  - Reaction Timer: https://codecup-coffee-rush.netlify.app/reaction-timer.html
  - Math Rush: https://codecup-coffee-rush.netlify.app/math-rush.html

## Future game ideas
- Coffee shop upgrade game
- Typing speed game

## Future improvements
- Daily challenge mode
- Background music toggle
- More Memory Match themes / difficulty levels
- More special coffee types (Coffee Rush)
- Per-difficulty best scores for Math Rush
- Profanity filter on leaderboard nicknames (server-side)
- Per-difficulty leaderboard tabs on the leaderboard page

## Coffee Escape — future ideas
- v1.2 polish:
  - Sound effects (footsteps, crash, jump, "Oof!") with mute toggle
  - Distance-based and score-based achievements (e.g., "100 m", "Survived 60 s")
  - Different "chasers" the player picks from (tired man, sleepy teen, boss)
  - More rooms to escape through (kitchen, hallway, front door) as speed tiers
  - Day/night cycle in the house background
- v1.3 systems:
  - Power-ups: espresso shot (speed boost), cinnamon (slo-mo), sugar cube (shield for one hit)
  - Coins / collectibles floating in the air for bonus score
  - Obstacle variety: dog, sleeping cat, rolling vacuum, rug that slides
  - Animated finish line / "Made it to the kitchen!" end-of-run celebration
  - Mobile tilt control as an alternative to tapping
  - Cloud save best score (Supabase) for cross-device leaderboard

## Completed tasks
- Built Coffee Rush
- Added normal coffee worth +1
- Added golden coffee worth +5
- Added difficulty modes
- Added combo system
- Added sound button
- Added Support CodeCup Studio button
- Added achievements
- Added per-cup visibility timeout
- Added share score button
- Added best score saving
- Connected GitHub to Netlify
- Published Coffee Rush online
- Built Reaction Timer
- Built Memory Match
- Built Math Rush
- Built Coffee Escape (endless runner)
- Coffee Escape v1.1 — animated 5-scene cutscene, cup arms/legs, four facial expressions, man running animation, "Oof!" trip gag
- Coffee Escape v1.2 — "Coming soon" gate on the arcade homepage, signed-in dev bypass
- Added Supabase-backed accounts (email + password, nickname 1–12 chars)
- Restructured into CodeCup Arcade
- Added arcade homepage with game cards
- Added cross-game links and "Back to Arcade" buttons
- Added per-game reset best/progress buttons
- Added Supabase-backed global leaderboard (top 100 per game)
- Added leaderboard.html with 4 tabs and a shared client module
