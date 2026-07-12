/* Memory Match 🧠 — match all 8 pairs in as few moves and as little time as possible. */

(function () {
  "use strict";

  // --- Config ---
  const STORAGE_KEY_MOVES = "memoryMatchBestMoves";
  const STORAGE_KEY_TIME  = "memoryMatchBestMs";
  const SYMBOLS = ["☕", "✨", "⚡", "👑", "🔥", "🎮", "⭐", "🍩"];
  const TOTAL_PAIRS = SYMBOLS.length; // 8
  const CHECK_DELAY_MS = 700;
  const TIMER_TICK_MS = 200;

  // --- State ---
  let deck = [];            // 16 symbols, shuffled
  let flipped = [];         // 0, 1, or 2 card buttons currently face up
  let matchedCount = 0;
  let moves = 0;
  let elapsedMs = 0;
  let timerId = null;
  let timerStart = 0;
  let gameStarted = false;
  let checking = false;     // true during the post-pair window

  // --- Persistence (best results) ---
  let bestMoves = loadNumber(STORAGE_KEY_MOVES);
  let bestMs    = loadNumber(STORAGE_KEY_TIME);

  function loadNumber(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return null;
      const n = parseInt(raw, 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch (e) {
      return null;
    }
  }
  function saveNumber(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (e) { /* ignore */ }
  }

  // --- Elements ---
  const gridEl             = document.getElementById("memoryGrid");
  const movesEl            = document.getElementById("mmMoves");
  const timeEl             = document.getElementById("mmTime");
  const bestMovesEl        = document.getElementById("mmBestMoves");
  const bestTimeEl         = document.getElementById("mmBestTime");
  const newGameBtn         = document.getElementById("mmNewGame");
  const winScreenEl        = document.getElementById("mmWinScreen");
  const winCurrentTimeEl   = document.getElementById("mmWinCurrentTime");
  const winCurrentMovesEl  = document.getElementById("mmWinCurrentMoves");
  const winBestTimeVal     = document.getElementById("mmWinBestTime");
  const winBestMovesVal    = document.getElementById("mmWinBestMoves");
  const winBestTimeBadge   = document.getElementById("mmWinBestTimeBadge");
  const winBestMovesBadge  = document.getElementById("mmWinBestMovesBadge");
  const tryAgainBtn        = document.getElementById("mmTryAgain");
  const resetBestBtn       = document.getElementById("mmResetBest");

  // --- Global leaderboard (Supabase) ---
  const lbListMM          = document.getElementById("lbListMM");
  const lbNicknameMM      = document.getElementById("lbNicknameMM");
  const lbSubmitMM        = document.getElementById("lbSubmitMM");
  const lbStatusMM        = document.getElementById("lbStatusMM");

  // --- Helpers ---
  function shuffle(arr) {
    // Fisher-Yates
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }
  function pad2(n) { return n < 10 ? "0" + n : String(n); }
  function formatMs(ms) {
    if (ms == null) return "—";
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return pad2(m) + ":" + pad2(s);
  }
  function formatMoves(n) { return n == null ? "—" : String(n); }

  // --- Game flow ---
  function newGame() {
    stopTimer();
    matchedCount = 0;
    moves = 0;
    elapsedMs = 0;
    gameStarted = false;
    checking = false;
    flipped = [];
    deck = shuffle([].concat(SYMBOLS, SYMBOLS));
    renderGrid();
    renderStats();
    hideWinScreen();
  }

  function renderGrid() {
    gridEl.innerHTML = "";
    for (let i = 0; i < deck.length; i++) {
      const symbol = deck[i];
      const card = document.createElement("button");
      card.className = "memory-card";
      card.type = "button";
      card.setAttribute("data-symbol", symbol);
      card.setAttribute("aria-label", "Card " + (i + 1) + " face down");
      card.disabled = false;

      const back = document.createElement("span");
      back.className = "memory-card-face memory-card-back";
      back.setAttribute("aria-hidden", "true");
      back.textContent = "?";

      const front = document.createElement("span");
      front.className = "memory-card-face memory-card-front";
      front.setAttribute("aria-hidden", "true");
      front.textContent = symbol;

      card.appendChild(back);
      card.appendChild(front);
      // Cards are <button> elements. CSS sets touch-action: manipulation
      // on .memory-card, so the browser does not impose a 300ms
      // double-tap delay and click fires for both mouse and touch.
      card.addEventListener("click", onCardClick);
      gridEl.appendChild(card);
    }
  }

  function onCardClick(e) {
    const card = e.currentTarget;
    if (checking) return;
    if (card.classList.contains("is-flipped")) return;
    if (card.classList.contains("is-matched")) return;

    if (!gameStarted) {
      gameStarted = true;
      startTimer();
    }

    card.classList.add("is-flipped");
    const symbol = card.getAttribute("data-symbol");
    card.setAttribute("aria-label", "Card showing " + symbol);
    flipped.push(card);

    if (flipped.length === 2) {
      moves += 1;
      renderStats();
      checking = true;
      const a = flipped[0];
      const b = flipped[1];
      const match = a.getAttribute("data-symbol") === b.getAttribute("data-symbol");
      if (match) {
        lockMatch(a, b);
      } else {
        // Schedule a flip-back after the player has had a moment to register
        // the mismatch. Guarded so that the timer survives a 'New Game'
        // click — if a new game starts mid-window, we silently drop it.
        setTimeout(function () {
          if (!checking) return; // new game already started
          a.classList.remove("is-flipped");
          b.classList.remove("is-flipped");
          a.setAttribute("aria-label", "Card face down");
          b.setAttribute("aria-label", "Card face down");
          flipped = [];
          checking = false;
        }, CHECK_DELAY_MS);
      }
    }
  }

  function lockMatch(a, b) {
    a.classList.add("is-matched");
    b.classList.add("is-matched");
    a.disabled = true;
    b.disabled = true;
    flipped = [];
    checking = false;
    matchedCount += 1;
    if (matchedCount === TOTAL_PAIRS) {
      win();
    }
  }

  function startTimer() {
    timerStart = performance.now();
    elapsedMs = 0;
    timeEl.textContent = formatMs(0);
    timerId = setInterval(function () {
      elapsedMs = performance.now() - timerStart;
      timeEl.textContent = formatMs(elapsedMs);
    }, TIMER_TICK_MS);
  }

  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
  }

  function renderStats() {
    movesEl.textContent     = String(moves);
    timeEl.textContent      = formatMs(elapsedMs);
    bestMovesEl.textContent = formatMoves(bestMoves);
    bestTimeEl.textContent  = bestMs == null ? "—" : formatMs(bestMs);
  }

  function win() {
    stopTimer();
    const finalMs = Math.round(elapsedMs);
    const isNewBestMoves = bestMoves == null || moves < bestMoves;
    const isNewBestTime  = bestMs    == null || finalMs < bestMs;
    if (isNewBestMoves) {
      bestMoves = moves;
      saveNumber(STORAGE_KEY_MOVES, bestMoves);
    }
    if (isNewBestTime) {
      bestMs = finalMs;
      saveNumber(STORAGE_KEY_TIME, bestMs);
    }
    renderStats();

    winCurrentMovesEl.textContent = String(moves);
    winCurrentTimeEl.textContent  = formatMs(finalMs);
    winBestMovesVal.textContent   = formatMoves(bestMoves);
    winBestTimeVal.textContent    = bestMs == null ? "—" : formatMs(bestMs);
    winBestMovesBadge.hidden      = !isNewBestMoves;
    winBestTimeBadge.hidden       = !isNewBestTime;
    showWinScreen();

    // Load the top-100 leaderboard for this game. Errors are shown inline
    // and don't block the win screen.
    loadLeaderboardMM();
  }

  function escapeHtmlMM(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function renderLbRowsMM(targetEl, rows, currentNickname) {
    if (!rows || rows.length === 0) {
      targetEl.innerHTML = '<li class="lb-empty">No scores yet. Be the first!</li>';
      return;
    }
    const parts = [];
    const lcNick = (currentNickname || "").toLowerCase();
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const isYou = lcNick && (r.nickname || "").toLowerCase() === lcNick;
      const value = window.Leaderboard.formatGameValue("memory-match", r);
      parts.push(
        '<li class="' + (isYou ? "is-you" : "") + '">' +
          '<span class="lb-rank">#' + (i + 1) + '</span>' +
          '<span class="lb-name">' + escapeHtmlMM(r.nickname || "") + '</span>' +
          '<span class="lb-value">' + escapeHtmlMM(value) + '</span>' +
        '</li>'
      );
    }
    targetEl.innerHTML = parts.join("");
  }

  let lastSubmittedNickMM = "";

  function loadLeaderboardMM() {
    lbListMM.setAttribute("aria-busy", "true");
    lbListMM.innerHTML = '<li class="lb-empty">Loading…</li>';
    window.Leaderboard.fetchTop100("memory-match").then(function (res) {
      lbListMM.setAttribute("aria-busy", "false");
      if (res.error) {
        lbListMM.innerHTML = '<li class="lb-error">Couldn\'t load leaderboard.</li>';
        return;
      }
      const currentNick = (lbNicknameMM && lbNicknameMM.value || "").trim() || lastSubmittedNickMM;
      renderLbRowsMM(lbListMM, res.data, currentNick);
    });
  }

  function handleSubmitMM() {
    const nick = (lbNicknameMM.value || "").trim();
    if (nick.length < 1 || nick.length > 12) {
      lbStatusMM.textContent = "Nickname must be 1-12 characters.";
      lbStatusMM.classList.add("is-error");
      return;
    }
    lbStatusMM.classList.remove("is-error");
    lbStatusMM.textContent = "Submitting…";
    lbSubmitMM.disabled = true;
    window.Leaderboard.submitScore({
      game: "memory-match",
      nickname: nick,
      moves: moves,
      timeSeconds: Math.round(elapsedMs),
    }).then(function (res) {
      lbSubmitMM.disabled = false;
      if (res.ok) {
        lastSubmittedNickMM = nick;
        lbStatusMM.classList.remove("is-error");
        lbStatusMM.textContent = "✓ Submitted!";
        loadLeaderboardMM();
      } else {
        lbStatusMM.classList.add("is-error");
        lbStatusMM.textContent = "Couldn't submit — try again.";
      }
    });
  }

  function showWinScreen() { winScreenEl.hidden = false; }
  function hideWinScreen() { winScreenEl.hidden = true; }

  function handleResetBest() {
    const ok = window.confirm("Reset best moves and best time?");
    if (!ok) return;
    try { localStorage.removeItem(STORAGE_KEY_MOVES); } catch (e) { /* ignore */ }
    try { localStorage.removeItem(STORAGE_KEY_TIME); }  catch (e) { /* ignore */ }
    bestMoves = null;
    bestMs = null;
    renderStats();
  }

  // --- Init ---
  function init() {
    newGame();
    newGameBtn.addEventListener("click", newGame);
    tryAgainBtn.addEventListener("click", newGame);
    if (resetBestBtn) resetBestBtn.addEventListener("click", handleResetBest);
    if (lbSubmitMM) lbSubmitMM.addEventListener("click", handleSubmitMM);
  }

  init();
})();
