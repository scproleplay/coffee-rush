/* Coffee Rush — click the cup as many times as you can! */

(function () {
  "use strict";

  // --- Config ---
  const STORAGE_KEY = "coffeeRushBestScore";
  const SOUND_KEY = "coffeeRushSoundOn";
  const ACHIEVEMENTS_KEY = "coffeeRushAchievements";
  const SHARE_URL = "https://codecup-coffee-rush.netlify.app";
  const GOLDEN_CHANCE = 0.25; // ~25% of cups are golden
  const COMBO_WINDOW_MS = 900; // clicks within this window keep the combo alive
  const COMBO_BURST_THRESHOLD = 2; // show "Combo xN!" starting at x2
  const COUNTDOWN_SECONDS = ["3", "2", "1", "GO!"];

  // Difficulty profiles
  const DIFFICULTIES = {
    easy:   { duration: 30, cupSize: "size-easy",   cupBase: 110, insane: false, label: "Easy Mode" },
    normal: { duration: 30, cupSize: "",            cupBase: 90,  insane: false, label: "Normal Mode" },
    hard:   { duration: 20, cupSize: "size-hard",   cupBase: 70,  insane: false, label: "Hard Mode" },
    insane: { duration: 15, cupSize: "size-insane", cupBase: 70,  insane: true,  label: "Insane Mode" },
  };

  // Rank tiers (score -> { name, emoji })
  const RANKS = [
    { min:  0, max: 20,  name: "Beginner Sipper", emoji: "🥛" },
    { min: 21, max: 50,  name: "Coffee Catcher",  emoji: "☕" },
    { min: 51, max: 80,  name: "Caffeine Pro",    emoji: "⚡" },
    { min: 81, max: Infinity, name: "Coffee Master", emoji: "👑" },
  ];

  // Achievements: each test receives the final game stats and returns true
  // if the achievement is earned by that game.
  const ACHIEVEMENTS = [
    { id: "first_sip",      name: "First Sip",      emoji: "☕", desc: "Score at least 1 point",                       test: function (g) { return g.score >= 1; } },
    { id: "coffee_catcher", name: "Coffee Catcher", emoji: "🥤", desc: "Score at least 25 points",                      test: function (g) { return g.score >= 25; } },
    { id: "caffeine_pro",   name: "Caffeine Pro",   emoji: "⚡", desc: "Score at least 50 points",                      test: function (g) { return g.score >= 50; } },
    { id: "coffee_master",  name: "Coffee Master",  emoji: "👑", desc: "Score at least 100 points",                     test: function (g) { return g.score >= 100; } },
    { id: "golden_hunter",  name: "Golden Hunter",  emoji: "✨", desc: "Catch 5 golden coffees in one game",            test: function (g) { return g.goldenCups >= 5; } },
  ];

  // --- Elements ---
  const welcomeScreen   = document.getElementById("welcomeScreen");
  const gameUI          = document.getElementById("gameUI");
  const gameOverScreen  = document.getElementById("gameOverScreen");
  const startGameBtn    = document.getElementById("startGameBtn");
  const playAgainBtn    = document.getElementById("playAgainBtn");
  const backToMenuBtn   = document.getElementById("backToMenuBtn");
  const shareFinalBtn   = document.getElementById("shareFinalBtn");
  const difficultyBtns  = document.querySelectorAll(".difficulty-btn");
  const welcomeBestEl   = document.getElementById("welcomeBest");

  const scoreEl         = document.getElementById("score");
  const timeEl          = document.getElementById("time");
  const comboEl         = document.getElementById("combo");
  const difficultyBadge = document.getElementById("difficultyBadge");
  const countdownEl     = document.getElementById("countdown");
  const countdownText   = countdownEl.querySelector(".countdown-text");

  const cup             = document.getElementById("cup");
  const playArea        = document.getElementById("playArea");
  const messageEl       = document.getElementById("message");
  const sparklesEl      = cup.querySelector(".sparkles");

  const finalScoreEl    = document.getElementById("finalScore");
  const finalBestEl     = document.getElementById("finalBest");
  const rankEmojiEl     = document.getElementById("rankEmoji");
  const rankNameEl      = document.getElementById("rankName");
  const achievementToastEl = document.getElementById("achievementToast");
  const achievementsListEl = document.getElementById("achievementsList");
  const achievementsCountEl = document.getElementById("achievementsCount");

  const copiedToast     = document.getElementById("copiedToast");
  const soundToggle     = document.getElementById("soundToggle");
  const soundIcon       = document.getElementById("soundIcon");

  // Populate the sparkles once (only visible when .cup.golden)
  if (sparklesEl && !sparklesEl.children.length) {
    for (let i = 1; i <= 4; i++) {
      const s = document.createElement("span");
      s.className = "spark spark-" + i;
      s.textContent = "✨";
      sparklesEl.appendChild(s);
    }
  }

  // --- State ---
  let score = 0;
  let timeLeft = 0;
  let gameDuration = 30;
  let currentDifficulty = "normal";
  let isPlaying = false;
  let isGolden = false;
  let timerId = null;
  let countdownId = null;
  let copiedTimerId = null;
  let bestScore = loadBest();
  let soundOn = loadSoundPref();
  let combo = 0;
  let lastClickAt = 0;
  let comboResetTimerId = null;
  let goldenCupsCaught = 0;
  let unlockedAchievements = loadAchievements();
  let achievementToastTimerId = null;

  // --- Audio (WebAudio click sound, no external files) ---
  let audioCtx = null;
  function getAudioCtx() {
    if (audioCtx) return audioCtx;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    } catch (e) {
      audioCtx = null;
    }
    return audioCtx;
  }
  function playClick(opts) {
    if (!soundOn) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    // Resume context if browser suspended it (autoplay policy)
    if (ctx.state === "suspended") {
      try { ctx.resume(); } catch (e) { /* ignore */ }
    }
    const o = opts || {};
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = o.type || "square";
    osc.frequency.setValueAtTime(o.freq || 720, now);
    osc.frequency.exponentialRampToValueAtTime(o.freqEnd || (o.freq ? o.freq * 0.5 : 320), now + 0.08);
    const peak = o.peak != null ? o.peak : 0.18;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (o.dur || 0.09));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (o.dur || 0.1) + 0.02);
  }
  function playGoldenSound() { playClick({ type: "triangle", freq: 1100, freqEnd: 1600, peak: 0.22, dur: 0.14 }); }
  function playNormalSound() { playClick({ type: "square",   freq: 720,  freqEnd: 360,  peak: 0.16, dur: 0.08 }); }
  function playCountdownSound() { playClick({ type: "sine",   freq: 520,  freqEnd: 520,  peak: 0.14, dur: 0.12 }); }
  function playGoSound()         { playClick({ type: "sawtooth", freq: 880, freqEnd: 1320, peak: 0.22, dur: 0.18 }); }
  function playEndSound()        { playClick({ type: "sine",   freq: 440,  freqEnd: 220,  peak: 0.18, dur: 0.25 }); }

  // --- Persistence ---
  function loadBest() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const n = raw == null ? 0 : parseInt(raw, 10);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch (e) {
      return 0;
    }
  }
  function saveBest(n) {
    try { localStorage.setItem(STORAGE_KEY, String(n)); } catch (e) { /* ignore */ }
  }
  function loadSoundPref() {
    try {
      const raw = localStorage.getItem(SOUND_KEY);
      if (raw == null) return true;
      return raw === "1";
    } catch (e) {
      return true;
    }
  }
  function saveSoundPref(on) {
    try { localStorage.setItem(SOUND_KEY, on ? "1" : "0"); } catch (e) { /* ignore */ }
  }
  function loadAchievements() {
    // Returns a Set of achievement IDs already unlocked.
    try {
      const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return new Set();
      return new Set(arr.filter(function (x) { return typeof x === "string"; }));
    } catch (e) {
      return new Set();
    }
  }
  function saveAchievements(set) {
    try { localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(Array.from(set))); }
    catch (e) { /* ignore */ }
  }

  // --- Helpers ---
  function setMessage(text, win) {
    messageEl.textContent = text || "";
    messageEl.classList.toggle("win", !!win);
  }
  function showCopiedToast(text) {
    copiedToast.textContent = text;
    copiedToast.classList.add("show");
    if (copiedTimerId) clearTimeout(copiedTimerId);
    copiedTimerId = setTimeout(function () {
      copiedToast.classList.remove("show");
    }, 1600);
  }
  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "-1000px";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        ok ? resolve() : reject(new Error("copy failed"));
      } catch (err) {
        reject(err);
      }
    });
  }
  function updateScore() { scoreEl.textContent = String(score); }
  function updateTime()  { timeEl.textContent  = String(timeLeft); }
  function updateCombo() { comboEl.textContent = "x" + (combo || 1); }
  function placeCupCenter() {
    const area = playArea.getBoundingClientRect();
    const cupSize = cup.offsetWidth || 90;
    const x = (area.width - cupSize) / 2;
    const y = (area.height - cupSize) / 2;
    cup.style.left = x + "px";
    cup.style.top  = y + "px";
  }
  function moveCupRandom() {
    const area = playArea.getBoundingClientRect();
    const cupSize = cup.offsetWidth || 90;
    const padding = 10;
    const maxX = Math.max(0, area.width - cupSize - padding);
    const maxY = Math.max(0, area.height - cupSize - padding);
    const x = padding + Math.random() * maxX;
    const y = padding + Math.random() * maxY;
    cup.style.left = x + "px";
    cup.style.top  = y + "px";

    // ~25% chance to spawn a golden cup
    isGolden = Math.random() < GOLDEN_CHANCE;
    cup.classList.toggle("golden", isGolden);
  }
  function applyCupSize(diffKey) {
    const cfg = DIFFICULTIES[diffKey];
    cup.classList.remove("size-easy", "size-hard", "size-insane", "insane");
    if (cfg.cupSize) cup.classList.add(cfg.cupSize);
    if (cfg.insane) cup.classList.add("insane");
  }
  function spawnFloatText(points) {
    const el = document.createElement("span");
    el.className = "float-text plus" + points;
    el.textContent = "+" + points;
    const areaRect  = playArea.getBoundingClientRect();
    const cupRect   = cup.getBoundingClientRect();
    const x = cupRect.left - areaRect.left + cupRect.width / 2;
    const y = cupRect.top  - areaRect.top  + cupRect.height / 2;
    el.style.left = x + "px";
    el.style.top  = y + "px";
    playArea.appendChild(el);
    el.addEventListener("animationend", function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  }
  function spawnComboBurst(level) {
    const el = document.createElement("div");
    el.className = "combo-burst" + (level >= 5 ? " x-high" : "");
    el.textContent = "Combo x" + level + "!";
    playArea.appendChild(el);
    el.addEventListener("animationend", function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  }
  function rankFor(s) {
    for (let i = 0; i < RANKS.length; i++) {
      if (s >= RANKS[i].min && s <= RANKS[i].max) return RANKS[i];
    }
    return RANKS[0];
  }

  // --- Screens ---
  function showWelcome() {
    cancelCountdown();
    if (timerId) { clearInterval(timerId); timerId = null; }
    isPlaying = false;
    combo = 0;
    lastClickAt = 0;
    if (comboResetTimerId) { clearTimeout(comboResetTimerId); comboResetTimerId = null; }

    welcomeBestEl.textContent = String(bestScore);
    welcomeScreen.hidden = false;
    gameUI.hidden = true;
    gameOverScreen.hidden = true;
    // Hide any leftover achievement toast from a previous game
    achievementToastEl.hidden = true;
    if (achievementToastTimerId) { clearTimeout(achievementToastTimerId); achievementToastTimerId = null; }
  }
  function showGame() {
    welcomeScreen.hidden = true;
    gameOverScreen.hidden = true;
    gameUI.hidden = false;
  }
  function showGameOver(newlyUnlocked) {
    if (timerId) { clearInterval(timerId); timerId = null; }
    isPlaying = false;
    playArea.classList.add("disabled");

    finalScoreEl.textContent = String(score);
    finalBestEl.textContent  = String(bestScore);
    const rank = rankFor(score);
    rankEmojiEl.textContent = rank.emoji;
    rankNameEl.textContent  = rank.name;

    renderAchievements(newlyUnlocked || []);

    gameUI.hidden = true;
    welcomeScreen.hidden = true;
    gameOverScreen.hidden = false;
  }

  function renderAchievements(newlyUnlocked) {
    // Build the tile list. Clear any previous content first so a re-render
    // (e.g. back to game-over from main menu) doesn't duplicate tiles.
    achievementsListEl.innerHTML = "";
    const newlyUnlockedIds = new Set(newlyUnlocked.map(function (a) { return a.id; }));

    for (let i = 0; i < ACHIEVEMENTS.length; i++) {
      const a = ACHIEVEMENTS[i];
      const isUnlocked = unlockedAchievements.has(a.id);
      const isNew = newlyUnlockedIds.has(a.id);

      const li = document.createElement("li");
      li.className = "achievement-tile " + (isUnlocked ? "unlocked" : "locked") + (isNew ? " newly-unlocked" : "");
      li.title = a.desc;
      li.setAttribute("aria-label", (isUnlocked ? "Unlocked: " : "Locked: ") + a.name + " — " + a.desc);

      const emojiEl = document.createElement("span");
      emojiEl.className = "achievement-emoji";
      emojiEl.textContent = a.emoji;
      li.appendChild(emojiEl);

      const nameEl = document.createElement("span");
      nameEl.className = "achievement-name";
      nameEl.textContent = a.name;
      li.appendChild(nameEl);

      achievementsListEl.appendChild(li);
    }

    const total = ACHIEVEMENTS.length;
    const unlockedCount = unlockedAchievements.size;
    achievementsCountEl.textContent = unlockedCount + "/" + total;

    // Show the toast only if there's a fresh unlock this game
    if (newlyUnlocked.length > 0) {
      const names = newlyUnlocked.map(function (a) { return a.name; });
      achievementToastEl.textContent = "🏆 Unlocked: " + names.join(" · ");
      achievementToastEl.hidden = false;
      // Restart the slide-in animation each time it appears
      achievementToastEl.style.animation = "none";
      void achievementToastEl.offsetWidth;
      achievementToastEl.style.animation = "";
      if (achievementToastTimerId) clearTimeout(achievementToastTimerId);
      achievementToastTimerId = setTimeout(function () {
        achievementToastEl.hidden = true;
        achievementToastTimerId = null;
      }, 3500);
    } else {
      achievementToastEl.hidden = true;
    }
  }

  // --- Difficulty selection ---
  function selectDifficulty(key) {
    if (!DIFFICULTIES[key]) return;
    currentDifficulty = key;
    difficultyBtns.forEach(function (b) {
      const isSel = b.getAttribute("data-difficulty") === key;
      b.classList.toggle("selected", isSel);
      b.setAttribute("aria-checked", isSel ? "true" : "false");
    });
  }

  // --- Countdown ---
  function cancelCountdown() {
    if (countdownId) { clearTimeout(countdownId); countdownId = null; }
    countdownEl.hidden = true;
  }
  function runCountdown(onDone) {
    cancelCountdown();
    countdownEl.hidden = false;
    let i = 0;
    function showNext() {
      if (i >= COUNTDOWN_SECONDS.length) {
        countdownEl.hidden = true;
        onDone();
        return;
      }
      const label = COUNTDOWN_SECONDS[i];
      countdownText.textContent = label;
      countdownText.classList.toggle("go", label === "GO!");
      // Restart the CSS animation
      countdownText.style.animation = "none";
      void countdownText.offsetWidth;
      countdownText.style.animation = "";
      if (label === "GO!") {
        playGoSound();
      } else {
        playCountdownSound();
      }
      i++;
      countdownId = setTimeout(showNext, 1000);
    }
    showNext();
  }

  // --- Game flow ---
  function startGame() {
    if (isPlaying) return;
    const cfg = DIFFICULTIES[currentDifficulty];
    gameDuration = cfg.duration;
    timeLeft = gameDuration;
    score = 0;
    combo = 0;
    lastClickAt = 0;
    goldenCupsCaught = 0;
    if (comboResetTimerId) { clearTimeout(comboResetTimerId); comboResetTimerId = null; }

    applyCupSize(currentDifficulty);
    difficultyBadge.textContent = cfg.label;

    updateScore();
    updateTime();
    updateCombo();
    setMessage("Get ready…", false);
    hideShareUi();
    showGame();
    placeCupCenter();

    // Disable cup until "GO!"
    playArea.classList.add("disabled");
    cup.classList.remove("golden");

    runCountdown(function () {
      isPlaying = true;
      playArea.classList.remove("disabled");
      setMessage("Go! Tap the cup! ☕", false);
      moveCupRandom();
      timerId = setInterval(tick, 1000);
    });
  }

  function tick() {
    timeLeft--;
    updateTime();
    if (timeLeft <= 0) endGame();
  }

  function endGame() {
    if (timerId) { clearInterval(timerId); timerId = null; }
    isPlaying = false;
    if (comboResetTimerId) { clearTimeout(comboResetTimerId); comboResetTimerId = null; }

    const isNewBest = score > bestScore;
    if (isNewBest) {
      bestScore = score;
      saveBest(bestScore);
    }

    // Evaluate achievements for this game. newlyUnlocked lists the ones
    // that were just earned and weren't already in the saved set.
    const gameStats = { score: score, goldenCups: goldenCupsCaught };
    const newlyUnlocked = [];
    for (let i = 0; i < ACHIEVEMENTS.length; i++) {
      const a = ACHIEVEMENTS[i];
      if (!unlockedAchievements.has(a.id) && a.test(gameStats)) {
        unlockedAchievements.add(a.id);
        newlyUnlocked.push(a);
      }
    }
    if (newlyUnlocked.length > 0) {
      saveAchievements(unlockedAchievements);
      // Quick celebratory chime — three short high notes
      setTimeout(function () { playClick({ type: "triangle", freq: 880,  freqEnd: 1320, peak: 0.18, dur: 0.08 }); }, 0);
      setTimeout(function () { playClick({ type: "triangle", freq: 1175, freqEnd: 1760, peak: 0.18, dur: 0.08 }); }, 110);
      setTimeout(function () { playClick({ type: "triangle", freq: 1568, freqEnd: 2349, peak: 0.20, dur: 0.18 }); }, 220);
    }

    playEndSound();
    showGameOver(newlyUnlocked);
  }

  function handleCupClick(e) {
    e.preventDefault();
    if (!isPlaying) return;

    // Combo: count a click as continuing the combo if it lands within
    // COMBO_WINDOW_MS of the previous click. Otherwise it starts a new
    // combo at 1 (no multiplier). The multiplier is simply "combo".
    const now = performance.now();
    if (lastClickAt && (now - lastClickAt) <= COMBO_WINDOW_MS) {
      combo += 1;
    } else {
      combo = 1;
    }
    lastClickAt = now;

    // Reset combo if the player doesn't click again in time
    if (comboResetTimerId) clearTimeout(comboResetTimerId);
    comboResetTimerId = setTimeout(function () {
      combo = 0;
      updateCombo();
    }, COMBO_WINDOW_MS + 60);

    const basePoints = isGolden ? 5 : 1;
    const points = basePoints * combo;

    // Floating text shows the points actually earned
    spawnFloatText(points);
    if (combo >= COMBO_BURST_THRESHOLD) {
      spawnComboBurst(combo);
    }
    updateCombo();

    if (isGolden) {
      goldenCupsCaught += 1;
      playGoldenSound();
    } else {
      playNormalSound();
    }

    score += points;
    updateScore();
    moveCupRandom();

    // Pop animation
    cup.classList.remove("pop");
    void cup.offsetWidth;
    cup.classList.add("pop");
  }

  function hideShareUi() {
    /* No longer using a floating share button — share is on the game-over screen. */
  }

  function buildShareText() {
    return "I scored " + score + " in Coffee Rush ☕ Can you beat me? " + SHARE_URL;
  }

  function handleShare() {
    const text = buildShareText();
    copyToClipboard(text).then(
      function () { showCopiedToast("Copied to clipboard!"); },
      function () { showCopiedToast("Couldn't copy — try again"); }
    );
  }

  function handleResize() {
    if (isPlaying) return;
    if (!gameUI.hidden) placeCupCenter();
  }

  function toggleSound() {
    soundOn = !soundOn;
    soundIcon.textContent = soundOn ? "🔊" : "🔇";
    soundToggle.classList.toggle("muted", !soundOn);
    soundToggle.setAttribute("aria-pressed", soundOn ? "true" : "false");
    saveSoundPref(soundOn);
    if (soundOn) {
      // Give audible feedback when turning on
      playClick({ type: "sine", freq: 880, freqEnd: 660, peak: 0.14, dur: 0.1 });
    }
  }

  // --- Init display ---
  function init() {
    soundIcon.textContent = soundOn ? "🔊" : "🔇";
    soundToggle.classList.toggle("muted", !soundOn);
    soundToggle.setAttribute("aria-pressed", soundOn ? "true" : "false");
    selectDifficulty("normal");
    showWelcome();
  }

  // --- Events ---
  startGameBtn.addEventListener("click", function () {
    // Prime the audio context on this user gesture (mobile autoplay policy)
    getAudioCtx();
    startGame();
  });
  playAgainBtn.addEventListener("click", function () { getAudioCtx(); startGame(); });
  backToMenuBtn.addEventListener("click", showWelcome);
  shareFinalBtn.addEventListener("click", handleShare);
  soundToggle.addEventListener("click", toggleSound);

  difficultyBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const key = btn.getAttribute("data-difficulty");
      selectDifficulty(key);
    });
  });

  cup.addEventListener("click", handleCupClick);
  cup.addEventListener("touchstart", function (e) {
    if (isPlaying) e.preventDefault();
  }, { passive: false });

  window.addEventListener("resize", handleResize);
  window.addEventListener("orientationchange", handleResize);

  init();
})();
