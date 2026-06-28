# Coffee Escape v1.1 — cartoon chase upgrade

All work is contained in `coffee-escape.html` and `coffee-escape.js`. No new
files, no external assets (everything is HTML/CSS/JS shapes and emoji),
no copyrighted material. CodeCup Arcade style and the existing
endless-runner gameplay are preserved.

## 1. New animated intro cutscene (in-stage, 5 scenes)

Plays inside the same 16:9 `.ce-stage` box the game already uses — no
layout shift, no fullscreen takeover. The intro overlay is an absolutely
positioned `.ce-overlay` with its own scene container and is hidden
once the player clicks "Start Run" or finishes the last scene.

**New DOM (added to `coffee-escape.html`):**

- `#ceCutsceneOverlay` — full-stage overlay, contains the 5 scenes.
- 5 scene divs (`.ce-scene`) stacked, one shown at a time via `.active`.
  Each scene has a small background and 1–2 character divs.
- Character divs are pure HTML/CSS — divs with border, border-radius,
  and inline CSS. They use CSS keyframe animations (`animation`) to
  walk, wave, look around, stumble, etc.
- A subtitle `<p>` that fades in/out per scene.
- Buttons row at the bottom:
  - `Skip Intro` — closes the cutscene and goes to the start screen.
  - `Play Intro` (shown when arriving at the start screen) — replays the
    cutscene from the beginning.
  - `Start Run` — closes the cutscene and begins the run.

**5 scenes (each ~2.5s, total ~12.5s + transition):**

1. *Pouring.* Kettle shape on the left, empty cup on a counter.
   Coffee stream (a thin div) animates from kettle into cup. Cup fills.
   Subtitle: "You were just poured..."
2. *Cup comes alive.* Cup wiggles, then two stick arms and two stick
   legs pop out (CSS keyframes scale them from 0→1). Subtitle:
   "Then you came alive."
3. *Man walks in.* A tired man div (CSS shapes) walks in from the
   right, hunched, blinking. Subtitle: "He needs coffee."
4. *Cup gets scared.* Cup eyes widen (transform: scale), sweat drop
   appears. Subtitle: "But you don't want to be drunk."
5. *Man reaches.* Man reaches his hand out; cup turns and runs off
   the right edge of the stage. Subtitle: "RUN!"

After scene 5, the cutscene fades and the start screen is shown.

**Implementation notes:**
- All animations are CSS `@keyframes` on the character divs. JS only
  sets a class per scene and uses `setTimeout` to advance.
- The kettle, counter, cup, arms, legs, eyes, and man are all built
  with `<div>`s styled with `background`, `border-radius`, and
  `transform`. No images, no SVGs, no copyrighted shapes.
- The existing `ceStoryOverlay` (4-line text intro) is **replaced** by
  the new cutscene — keeping both would be confusing.

## 2. Coffee cup character — body, animation, expressions

Already drawn in canvas. The canvas drawing in `drawPlayer()` is
extended to give the cup:

- **Real arms and legs** (not just two short stroke lines):
  - Arms: two rounded-rect limbs with a small "hand" circle, attached
    to the cup sides. Pivot from the shoulder.
  - Legs: two rounded-rect limbs with small "shoe" ovals, pivoted
    from the hip. Swing in alternation driven by `p.runAnim`.
- **Expressions** are switched by `p.expression` (state field) and
  drawn from a small helper:
  - `'normal'` — gentle smile, normal eyes, used in start/menu and
    the cutscene. (For canvas, drawn on the intro cutscene — but the
    canvas player is only visible during play.)
  - `'scared'` — large eyes, raised brows, O-shaped mouth, sweat drop.
  - `'shocked'` — X-shaped eyes, mouth wide open, full body jolt (a
    quick `tilt` + vertical shake). Used near obstacles and on game
    over.
  - `'happy'` — closed smiling eyes (upward arcs), big grin. Used
    briefly when the man trips and right after dodging a tough
    obstacle.
- **Expression triggers**:
  - `normal` on start and after game over.
  - `scared` whenever a new obstacle spawns, for the duration the
    obstacle is in the play area.
  - `shocked` for ~0.6s when an obstacle enters the right portion of
    the screen (within 250px of the player), and during the
    collision/give-up animation.
  - `happy` for ~0.8s when the man trips (see §3).

## 3. Tired man character — running animation, tripping, "Oof!"

The man is now animated more cartoonishly. In `drawMan()`:

- **Real running animation**: legs swing (alternating sin offsets),
  arms pump forward/back, the body leans forward, and a small
  wobble rotates the head.
- **Tripping on furniture**: a new system in `update()`:
  - Each obstacle records the time it leaves the screen.
  - When the player successfully jumps over an obstacle AND the man
    is within 350 px of the obstacle's trailing edge, the man has a
    35% chance to trip on it. (Lightweight — only one in three
    dodges triggers a trip; chairs trip more often than sofas/tables.)
  - Trip state: `state.man.stunTimer` set to ~1.0s. During stun:
    man freezes with a tilted body, "Oof!" speech bubble appears
    (drawn as a small rounded rect with text), and 2 upcoming
    obstacles have their spawn delay bumped by +0.7s (giving the
    player a breather).
  - On trip: cup is set to `happy` for 0.8s, score gets a small
    `+5` bonus (shown as a floating `+5` text using the existing
    `ce-floating-cta` style), and `state.man.targetProximity`
    decreases a little (the man falls back).
  - "Oof!" is drawn as a small comic-style speech bubble: white
    rounded rect with tail, dark border, "Oof!" text inside.
- **Stun animation** while tripped: the man tilts backward, the
  reaching arm droops, the legs go stiff, small "stars" (★) circle
  around his head.
- **Reset**: after `stunTimer` elapses, the man resumes chasing and
  his proximity eases back up to 0.

## 4. UI / flow changes

- The start screen is **renamed/repurposed** as the post-cutscene
  landing. It now has three buttons:
  - `▶ Play Intro` — replays the cutscene.
  - `Start Run` — skips cutscene and goes straight to play.
  - (existing) Best score readout, mobile tip line.
- The HUD gets a small tweak: a tiny `💨` animation when the player
  jumps, and the score briefly flashes yellow on dodge (CSS class
  swap for 200ms).
- Game over still shows title + score + best + Try Again + Back to
  Arcade, but the cup on the cutscene shows the shocked/happy
  face based on the run (shocked for <50, scolded for 50–199,
  happy/relieved for ≥200).

## 5. Files to change

- **`coffee-escape.html`**:
  - Add `<style>` for the cutscene (scenes, character divs, keyframes,
    "Oof!" bubble, trip stars).
  - Replace the existing `#ceStoryOverlay` block with
    `#ceCutsceneOverlay` (5 scenes, character divs, subtitle,
    buttons).
  - Update `#ceStartOverlay` to add the `Play Intro` button.
  - Add `id="ceCutsceneStartBtn"` for `Start Run`, `id="ceCutsceneSkipBtn"`
    for `Skip Intro`, `id="cePlayIntroBtn"` for the start-screen button.
  - Bump footer to `Coffee Escape v1.1`.
- **`coffee-escape.js`**:
  - Replace the `playStoryThenStart` / `skipStory` text-line system
    with `playCutscene()` / `skipCutscene()` / `advanceScene()`.
  - Add cutscene state: `cutsceneIndex`, `cutsceneTimers`, `cutsceneRunning`.
  - Extend `state.player` with `expression`, `expressionTimer`,
    `shockTimer`, `happyTimer`.
  - Extend `state.man` with `stunTimer`, `tripOofTimer`, `legSwing`,
    `bodyLean`, `headWobble`.
  - Extend `state.obstacles` items with `spawnedAt` (used to detect
    dodges and apply trip chance after the obstacle leaves the
    screen).
  - Add `tryTripMan(o)` to `update()` — fires on dodge and applies
    the stun + spawn delays + cup-happy + score-bonus.
  - Rewrite `drawPlayer()` to draw proper arms/legs and pick face
    from the current expression.
  - Extend `drawMan()` with running animation, stun pose, "Oof!"
    bubble, and head stars.
  - Add `drawSpeechBubble(ctx, x, y, text)` helper for "Oof!".
  - Wire new buttons: `ceCutsceneStartBtn`, `ceCutsceneSkipBtn`,
    `cePlayIntroBtn`.

## 6. Risk & mitigations

- **Risk:** cutscene animation jitter on first paint. **Fix:** all
  scene transitions are class-based and the very first scene is
  applied on `DOMContentLoaded`, before any animation frame.
- **Risk:** canvas expressions overcomplicate drawing. **Fix:** the
  face is drawn through a single helper `drawFace(ctx, cupW, cupH,
  expr)` that switches on expression; the rest of the body code is
  the same.
- **Risk:** making the man trip too often feels unfair. **Fix:**
  only 35% per dodge, only when the man is close enough to plausibly
  hit the obstacle. Tunable constants at the top of `update()`.
- **Risk:** mobile performance. **Fix:** the cutscene uses CSS only
  (GPU-composited transforms, no canvas). The canvas still does the
  same per-frame work, plus a few extra shapes; runs at 60fps on
  mid-range phones.
- **Risk:** the existing game still works if the user clicks Start
  Run without watching the intro. **Fix:** the cutscene is purely
  cosmetic; the start screen and Start Run button are still there.

## 7. Out of scope

- No new best-score mechanics, no difficulty modes, no leaderboard
  wiring, no sound, no settings page. The TODO list will be updated
  to track those for a future v1.2.
