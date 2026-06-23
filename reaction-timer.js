/* Reaction Timer — wait for green, then click as fast as you can. */

(function () {
  "use strict";

  // --- Config ---
  const STORAGE_KEY = "reactionTimerBestMs";
  const MIN_WAIT_MS = 2000;
  const MAX_WAIT_MS = 5000;

  // --- State ---
  // One of: "idle" | "waiting" | "ready" | "result" | "too_soon"
  let state = "idle";
  let waitTimerId = null;
  let readyAt = 0;       // performance.now() captured when the screen turned green
  let lastMs = null;     // most recent reaction time, in ms (null until first complete attempt)
  let bestMs = loadBest();
  let tries = 0;

  // --- Elements ---
  const playArea    = document.getElementById("playArea");
  const messageEl   = document.getElementById("rtMessage");
  const resultTimeEl = document.getElementById("rtResultTime");
  const resultActionsEl = document.getElementById("rtResultActions");
  const tryAgainBtn = document.getElementById("rtTryAgain");
  const bestEl      = document.getElementById("rtBest");
  const lastEl      = document.getElementById("rtLast");
  const triesEl     = document.getElementById("rtTries");

  // --- Persistence ---
  function loadBest() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw == null) return null;
      const n = parseInt(raw, 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch (e) {
      return null;
    }
  }
  function saveBest(ms) {
    try { localStorage.setItem(STORAGE_KEY, String(ms)); } catch (e) { /* ignore */ }
  }

  // --- Display helpers ---
  function formatMs(ms) {
    if (ms == null) return "—";
    return ms + " ms";
  }
  function renderStats() {
    bestEl.textContent  = formatMs(bestMs);
    lastEl.textContent  = formatMs(lastMs);
    triesEl.textContent = String(tries);
  }
  function setStateClass(s) {
    playArea.classList.remove("is-idle", "is-waiting", "is-ready", "is-result", "is-too-soon");
    playArea.classList.add("is-" + s);
  }
  function clearWaitTimer() {
    if (waitTimerId) { clearTimeout(waitTimerId); waitTimerId = null; }
  }

  // --- State transitions ---
  function showIdle() {
    state = "idle";
    clearWaitTimer();
    setStateClass("idle");
    messageEl.textContent = "Tap to Start";
    messageEl.hidden = false;
    resultTimeEl.hidden = true;
    resultActionsEl.hidden = true;
    playArea.setAttribute("aria-label", "Start reaction timer");
  }
  function startWaiting() {
    state = "waiting";
    setStateClass("waiting");
    messageEl.textContent = "Wait...";
    messageEl.hidden = false;
    resultTimeEl.hidden = true;
    resultActionsEl.hidden = true;
    playArea.setAttribute("aria-label", "Wait for green");

    const delay = MIN_WAIT_MS + Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS);
    clearWaitTimer();
    waitTimerId = setTimeout(function () {
      waitTimerId = null;
      // Only flip to ready if we're still in the waiting state. (If the
      // player clicked too soon, we already left waiting.)
      if (state !== "waiting") return;
      showReady();
    }, delay);
  }
  function showReady() {
    state = "ready";
    setStateClass("ready");
    messageEl.textContent = "CLICK!";
    messageEl.hidden = false;
    resultTimeEl.hidden = true;
    resultActionsEl.hidden = true;
    // Capture the moment the green appears, NOT when the user clicks Start.
    readyAt = performance.now();
    playArea.setAttribute("aria-label", "Click now");
  }
  function showTooSoon() {
    state = "too_soon";
    setStateClass("too-soon");
    messageEl.textContent = "Too soon! 🤚";
    messageEl.hidden = false;
    resultTimeEl.hidden = true;
    resultActionsEl.hidden = false;
    playArea.setAttribute("aria-label", "Too soon — try again");
  }
  function showResult(ms) {
    state = "result";
    setStateClass("result");
    // The caller (handlePlayAreaClick) sets messageEl.textContent to
    // "New best! 🎉" or "Your time" right before calling us. We don't
    // overwrite it — we just make sure it's visible.
    messageEl.hidden = false;
    resultTimeEl.textContent = formatMs(ms);
    resultTimeEl.hidden = false;
    resultActionsEl.hidden = false;
    playArea.setAttribute("aria-label", "Reaction time " + ms + " milliseconds");
  }

  // --- Click handling ---
  function handlePlayAreaClick(e) {
    e.preventDefault();
    if (state === "idle") {
      startWaiting();
    } else if (state === "waiting") {
      // Player clicked before green. Cancel the pending timeout and
      // transition to the too-soon state. Don't count this as a try.
      clearWaitTimer();
      showTooSoon();
    } else if (state === "ready") {
      // The moment of truth.
      const now = performance.now();
      const ms = Math.round(now - readyAt);
      lastMs = ms;
      tries += 1;
      let isNewBest = bestMs == null || ms < bestMs;
      if (isNewBest) {
        bestMs = ms;
        saveBest(bestMs);
      }
      renderStats();
      if (isNewBest) {
        messageEl.textContent = "New best! 🎉";
      } else {
        messageEl.textContent = "Your time";
      }
      showResult(ms);
    }
    // In "result" and "too_soon" states, clicks on the play area itself
    // are no-ops — the visible buttons (Try Again / Back to Coffee Rush)
    // handle transitions.
  }

  function handleTryAgain() {
    showIdle();
  }

  // --- Init ---
  function init() {
    renderStats();
    showIdle();

    playArea.addEventListener("click", handlePlayAreaClick);
    // Avoid the 300ms double-tap delay on mobile by preventing the synthetic
    // mouse event that follows a touch on some browsers.
    playArea.addEventListener("touchstart", function (e) { e.preventDefault(); }, { passive: false });
    tryAgainBtn.addEventListener("click", function (e) {
      e.preventDefault();
      handleTryAgain();
    });
  }

  init();
})();
