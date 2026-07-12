/* Math Rush ➕ — solve as many problems as you can in 60 seconds. */

(function () {
  "use strict";

  // --- Config ---
  const STORAGE_KEY        = "mathRushBestScore";
  const SHARE_URL          = "https://codecup-coffee-rush.netlify.app/math-rush.html";
  const GAME_DURATION_SEC  = 60;
  const WRONG_RETRY_MS     = 2500;  // auto-advance window after a wrong answer
  const CORRECT_FEEDBACK_MS = 400;  // how long the "Correct!" message stays before the next question

  // --- Difficulty profiles ---
  // Each profile: allowed operations, operand range, points per correct, max factor for multiplication.
  const DIFFICULTIES = {
    easy:   { label: "Easy Mode",   ops: ["+", "-"],      min: 1, max:  20, points: 1, mulMax: 0  },
    normal: { label: "Normal Mode", ops: ["+", "-", "*"], min: 1, max:  50, points: 2, mulMax: 12 },
    hard:   { label: "Hard Mode",   ops: ["+", "-", "*"], min: 1, max: 100, points: 3, mulMax: 12 },
  };

  // --- State ---
  let currentDifficulty = "easy";
  let score = 0;
  let correct = 0;
  let wrong = 0;
  let timeLeft = GAME_DURATION_SEC;
  let question = null;            // { text, answer }
  let timerId = null;
  let wrongRetryTimerId = null;
  let feedbackTimerId = null;
  let bestScore = loadBest();
  let isPlaying = false;
  let isAnswered = false;         // true between correct submit and next-question display

  // --- Persistence ---
  function loadBest() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw == null) return 0;
      const n = parseInt(raw, 10);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch (e) {
      return 0;
    }
  }
  function saveBest(n) {
    try { localStorage.setItem(STORAGE_KEY, String(n)); } catch (e) { /* ignore */ }
  }

  // --- Elements ---
  const welcomeEl       = document.getElementById("mathWelcome");
  const gameUiEl        = document.getElementById("mathGameUI");
  const gameOverEl      = document.getElementById("mathGameOver");
  const scoreEl         = document.getElementById("mathScore");
  const timeEl          = document.getElementById("mathTime");
  const correctEl       = document.getElementById("mathCorrect");
  const wrongEl         = document.getElementById("mathWrong");
  const questionEl      = document.getElementById("mathQuestion");
  const inputEl         = document.getElementById("mathInput");
  const submitBtn       = document.getElementById("mathSubmit");
  const feedbackEl      = document.getElementById("mathFeedback");
  const keypadEl        = document.getElementById("mathKeypad");
  const difficultyBadge = document.getElementById("mathDifficultyBadge");
  const finalScoreEl    = document.getElementById("mathFinalScore");
  const finalBestEl     = document.getElementById("mathFinalBest");
  const finalCorrectEl  = document.getElementById("mathFinalCorrect");
  const finalWrongEl    = document.getElementById("mathFinalWrong");
  const newBestBadgeEl  = document.getElementById("mathNewBestBadge");
  const bestScoreEl     = document.getElementById("mathBestScore");
  const startGameBtn    = document.getElementById("mathStart");
  const playAgainBtn    = document.getElementById("mathPlayAgain");
  const mainMenuBtn     = document.getElementById("mathMainMenu");
  const shareFinalBtn   = document.getElementById("mathShareFinal");
  const difficultyBtns  = document.querySelectorAll(".difficulty-btn");
  const copiedToastEl   = document.getElementById("mathCopiedToast");
  const resetBestBtn    = document.getElementById("mathResetBest");

  // --- Global leaderboard (Supabase) ---
  const lbListMath       = document.getElementById("lbListMath");
  const lbNicknameMath   = document.getElementById("lbNicknameMath");
  const lbSubmitMath     = document.getElementById("lbSubmitMath");
  const lbStatusMath     = document.getElementById("lbStatusMath");

  // --- Helpers ---
  function randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }
  function pickFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function generateQuestion(diffKey) {
    const cfg = DIFFICULTIES[diffKey];
    const op = pickFrom(cfg.ops);
    let a = randInt(cfg.min, cfg.max);
    let b = randInt(cfg.min, cfg.max);
    if (op === "-") {
      if (b > a) { const t = a; a = b; b = t; } // ensure non-negative result
    } else if (op === "*") {
      a = randInt(1, cfg.mulMax);
      b = randInt(1, cfg.mulMax);
    }
    const answer = op === "+" ? a + b
                : op === "-" ? a - b
                :             a * b;
    return { text: a + " " + op + " " + b + " = ?", answer: answer };
  }
  function showCopiedToast(text) {
    copiedToastEl.textContent = text;
    copiedToastEl.classList.add("show");
    setTimeout(function () { copiedToastEl.classList.remove("show"); }, 1600);
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

  // --- Screens ---
  function showWelcome() {
    isPlaying = false;
    if (timerId) { clearInterval(timerId); timerId = null; }
    clearWrongRetry();
    clearFeedbackTimer();
    welcomeEl.hidden = false;
    gameUiEl.hidden = true;
    gameOverEl.hidden = true;
    bestScoreEl.textContent = String(bestScore);
  }
  function showGame() {
    welcomeEl.hidden = true;
    gameOverEl.hidden = true;
    gameUiEl.hidden = false;
  }
  function showGameOver() {
    isPlaying = false;
    if (timerId) { clearInterval(timerId); timerId = null; }
    clearWrongRetry();
    clearFeedbackTimer();

    const isNewBest = score > bestScore;
    if (isNewBest) {
      bestScore = score;
      saveBest(bestScore);
    }
    finalScoreEl.textContent = String(score);
    finalBestEl.textContent  = String(bestScore);
    finalCorrectEl.textContent = String(correct);
    finalWrongEl.textContent   = String(wrong);
    newBestBadgeEl.hidden = !isNewBest;

    gameUiEl.hidden = true;
    welcomeEl.hidden = true;
    gameOverEl.hidden = false;

    // Load the top-100 leaderboard for this game. Errors are shown inline
    // and don't block the game-over screen.
    loadLeaderboardMath();
  }

  // --- Global leaderboard helpers ---
  function escapeHtmlMath(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function renderLbRowsMath(targetEl, rows, currentNickname) {
    if (!rows || rows.length === 0) {
      targetEl.innerHTML = '<li class="lb-empty">No scores yet. Be the first!</li>';
      return;
    }
    const parts = [];
    const lcNick = (currentNickname || "").toLowerCase();
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const isYou = lcNick && (r.nickname || "").toLowerCase() === lcNick;
      const value = window.Leaderboard.formatGameValue("math-rush", r);
      parts.push(
        '<li class="' + (isYou ? "is-you" : "") + '">' +
          '<span class="lb-rank">#' + (i + 1) + '</span>' +
          '<span class="lb-name">' + escapeHtmlMath(r.nickname || "") + '</span>' +
          '<span class="lb-value">' + escapeHtmlMath(value) + '</span>' +
        '</li>'
      );
    }
    targetEl.innerHTML = parts.join("");
  }

  let lastSubmittedNickMath = "";

  function loadLeaderboardMath() {
    lbListMath.setAttribute("aria-busy", "true");
    lbListMath.innerHTML = '<li class="lb-empty">Loading…</li>';
    window.Leaderboard.fetchTop100("math-rush").then(function (res) {
      lbListMath.setAttribute("aria-busy", "false");
      if (res.error) {
        lbListMath.innerHTML = '<li class="lb-error">Couldn\'t load leaderboard.</li>';
        return;
      }
      const currentNick = (lbNicknameMath && lbNicknameMath.value || "").trim() || lastSubmittedNickMath;
      renderLbRowsMath(lbListMath, res.data, currentNick);
    });
  }

  function handleSubmitMath() {
    const nick = (lbNicknameMath.value || "").trim();
    if (nick.length < 1 || nick.length > 12) {
      lbStatusMath.textContent = "Nickname must be 1-12 characters.";
      lbStatusMath.classList.add("is-error");
      return;
    }
    lbStatusMath.classList.remove("is-error");
    lbStatusMath.textContent = "Submitting…";
    lbSubmitMath.disabled = true;
    window.Leaderboard.submitScore({
      game: "math-rush",
      nickname: nick,
      score: score,
    }).then(function (res) {
      lbSubmitMath.disabled = false;
      if (res.ok) {
        lastSubmittedNickMath = nick;
        lbStatusMath.classList.remove("is-error");
        lbStatusMath.textContent = "✓ Submitted!";
        loadLeaderboardMath();
      } else {
        lbStatusMath.classList.add("is-error");
        lbStatusMath.textContent = "Couldn't submit — try again.";
      }
    });
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

  // --- Game flow ---
  function startGame() {
    if (isPlaying) return;
    score = 0;
    correct = 0;
    wrong = 0;
    timeLeft = GAME_DURATION_SEC;
    isPlaying = true;
    isAnswered = false;
    difficultyBadge.textContent = DIFFICULTIES[currentDifficulty].label;
    updateScore(); updateTime(); updateCounters();
    setFeedback("", "");
    showGame();
    nextQuestion();
    timerId = setInterval(tick, 1000);
  }
  function tick() {
    timeLeft -= 1;
    updateTime();
    if (timeLeft <= 0) endGame();
  }
  function endGame() {
    if (timerId) { clearInterval(timerId); timerId = null; }
    showGameOver();
  }
  function nextQuestion() {
    isAnswered = false;
    question = generateQuestion(currentDifficulty);
    questionEl.textContent = question.text;
    inputEl.value = "";
    setFeedback("", "");
    // Defer focus to the next paint so the keyboard reliably opens on mobile.
    setTimeout(function () { inputEl.focus(); }, 0);
  }
  function handleSubmit() {
    if (!isPlaying || isAnswered) return;
    const raw = inputEl.value.trim();
    if (raw === "") return; // ignore empty submits
    const guess = parseInt(raw, 10);
    if (!Number.isFinite(guess)) return;
    if (guess === question.answer) {
      handleCorrect();
    } else {
      handleWrong();
    }
  }
  function handleCorrect() {
    isAnswered = true;
    const pts = DIFFICULTIES[currentDifficulty].points;
    score += pts;
    correct += 1;
    clearWrongRetry();
    updateScore();
    updateCounters();
    setFeedback("✓ Correct! +" + pts, "is-correct");
    if (feedbackTimerId) clearTimeout(feedbackTimerId);
    feedbackTimerId = setTimeout(function () {
      feedbackTimerId = null;
      if (isPlaying) nextQuestion();
    }, CORRECT_FEEDBACK_MS);
  }
  function handleWrong() {
    wrong += 1;
    updateCounters();
    setFeedback("✗ Try again", "is-wrong");
    // Reset the auto-advance timer. If the player submits another wrong
    // answer (or corrects), the timer is cancelled by the relevant handler.
    clearWrongRetry();
    wrongRetryTimerId = setTimeout(function () {
      wrongRetryTimerId = null;
      if (isPlaying && !isAnswered) {
        // Counted once via `wrong += 1` above. Move on.
        isAnswered = true;
        setFeedback("→ Skipped", "is-wrong");
        if (feedbackTimerId) clearTimeout(feedbackTimerId);
        feedbackTimerId = setTimeout(function () {
          feedbackTimerId = null;
          if (isPlaying) nextQuestion();
        }, CORRECT_FEEDBACK_MS);
      }
    }, WRONG_RETRY_MS);
  }
  function clearWrongRetry() {
    if (wrongRetryTimerId) { clearTimeout(wrongRetryTimerId); wrongRetryTimerId = null; }
  }
  function clearFeedbackTimer() {
    if (feedbackTimerId) { clearTimeout(feedbackTimerId); feedbackTimerId = null; }
  }

  // --- Display helpers ---
  function updateScore()   { scoreEl.textContent   = String(score); }
  function updateTime()    { timeEl.textContent    = String(timeLeft); }
  function updateCounters() {
    correctEl.textContent = String(correct);
    wrongEl.textContent   = String(wrong);
  }
  function setFeedback(text, cls) {
    feedbackEl.textContent = text;
    feedbackEl.classList.remove("is-correct", "is-wrong");
    if (cls) feedbackEl.classList.add(cls);
  }

  // --- Keypad ---
  // Each keypad button is a <button type="button"> and CSS sets
  // touch-action: manipulation on it, so the browser does not impose a
  // 300ms double-tap delay and click fires for both mouse and touch.
  function handleKeypadTap(e) {
    const btn = e.target.closest(".keypad-btn");
    if (!btn) return;
    const key = btn.getAttribute("data-key");
    const action = btn.getAttribute("data-action");
    if (action === "backspace") {
      e.preventDefault();
      inputEl.value = inputEl.value.slice(0, -1);
      inputEl.focus();
    } else if (action === "submit") {
      e.preventDefault();
      handleSubmit();
    } else if (key != null) {
      if (isAnswered) return; // ignore input between correct and next question
      inputEl.value = (inputEl.value + key).slice(0, 6); // cap to 6 digits
      inputEl.focus();
    }
  }
  function setupKeypad() {
    keypadEl.addEventListener("click", handleKeypadTap);
  }

  // --- Share ---
  function buildShareText() {
    return "I scored " + score + " in Math Rush ➕ Can you beat me? " + SHARE_URL;
  }
  function handleShare() {
    const text = buildShareText();
    copyToClipboard(text).then(
      function () { showCopiedToast("Copied to clipboard!"); },
      function () { showCopiedToast("Couldn't copy — try again"); }
    );
  }

  // --- Reset best ---
  function handleResetBest() {
    const ok = window.confirm("Reset best score?");
    if (!ok) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    bestScore = 0;
    bestScoreEl.textContent = "0";
    showCopiedToast("Best reset");
  }

  // --- Init ---
  function init() {
    bestScoreEl.textContent = String(bestScore);
    selectDifficulty("normal");
    showWelcome();
    setupKeypad();

    startGameBtn.addEventListener("click", startGame);
    playAgainBtn.addEventListener("click", startGame);
    mainMenuBtn.addEventListener("click", showWelcome);
    shareFinalBtn.addEventListener("click", handleShare);
    submitBtn.addEventListener("click", handleSubmit);
    if (resetBestBtn) resetBestBtn.addEventListener("click", handleResetBest);
    if (lbSubmitMath) lbSubmitMath.addEventListener("click", handleSubmitMath);

    inputEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    });
    // Strip non-digit input on the fly. The pattern attribute is a hint for
    // the mobile keyboard; this defends against desktop keyboard input.
    inputEl.addEventListener("input", function () {
      const cleaned = inputEl.value.replace(/[^0-9]/g, "").slice(0, 6);
      if (cleaned !== inputEl.value) inputEl.value = cleaned;
    });

    difficultyBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectDifficulty(btn.getAttribute("data-difficulty"));
      });
    });
  }

  init();
})();
