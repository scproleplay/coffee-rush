/* Reaction Timer — wait for green, then click as fast as you can. */

(function () {
  "use strict";

  // --- Config ---
  const STORAGE_KEY = "reactionTimerBestMs";
  const SHARE_URL = "https://codecup-coffee-rush.netlify.app/reaction-timer.html";
  const MIN_WAIT_MS = 2000;
  const MAX_WAIT_MS = 5000;

  // --- State ---
  // One of: "idle" | "waiting" | "ready" | "result" | "too_soon"
  let state = "idle";
  let waitTimerId = null;
  let copiedTimerId = null;
  let readyAt = 0;       // performance.now() captured when the screen turned green
  let lastMs = null;     // most recent reaction time, in ms (null until first complete attempt)
  let bestMs = loadBest();
  let tries = 0;

  // --- Elements ---
  const playArea    = document.getElementById("playArea");
  const messageEl   = document.getElementById("rtMessage");
  const resultTimeEl = document.getElementById("rtResultTime");
  const ratingEl    = document.getElementById("rtRating");
  const resultActionsEl = document.getElementById("rtResultActions");
  const tryAgainBtn = document.getElementById("rtTryAgain");
  const shareBtn    = document.getElementById("rtShare");
  const resetBestBtn = document.getElementById("rtResetBest");
  const copiedToastEl = document.getElementById("rtCopiedToast");
  const bestEl      = document.getElementById("rtBest");
  const lastEl      = document.getElementById("rtLast");
  const triesEl     = document.getElementById("rtTries");

  // --- Global leaderboard (Supabase) ---
  const lbListRT          = document.getElementById("lbListRT");
  const lbNicknameRT      = document.getElementById("lbNicknameRT");
  const lbSubmitRT        = document.getElementById("lbSubmitRT");
  const lbStatusRT        = document.getElementById("lbStatusRT");

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
  function getRating(ms) {
    if (ms < 200)  return "Lightning Fast ⚡";
    if (ms < 350)  return "Very Fast 🔥";
    if (ms < 500)  return "Good 👍";
    return "Keep Practicing ☕";
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

  // --- Toast + clipboard ---
  function showCopiedToast(text) {
    copiedToastEl.textContent = text;
    copiedToastEl.classList.add("show");
    if (copiedTimerId) clearTimeout(copiedTimerId);
    copiedTimerId = setTimeout(function () {
      copiedToastEl.classList.remove("show");
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
  function buildShareText() {
    return "I got " + lastMs + " ms on Reaction Timer ⚡ Can you beat me? " + SHARE_URL;
  }

  // --- State transitions ---
  function showIdle() {
    state = "idle";
    clearWaitTimer();
    setStateClass("idle");
    messageEl.textContent = "Tap to Start";
    messageEl.hidden = false;
    resultTimeEl.hidden = true;
    ratingEl.hidden = true;
    resultActionsEl.hidden = true;
    shareBtn.hidden = true;
    playArea.setAttribute("aria-label", "Start reaction timer");
  }
  function startWaiting() {
    state = "waiting";
    setStateClass("waiting");
    messageEl.textContent = "Wait...";
    messageEl.hidden = false;
    resultTimeEl.hidden = true;
    ratingEl.hidden = true;
    resultActionsEl.hidden = true;
    shareBtn.hidden = true;
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
    ratingEl.hidden = true;
    resultActionsEl.hidden = true;
    shareBtn.hidden = true;
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
    ratingEl.hidden = true;
    resultActionsEl.hidden = false;
    shareBtn.hidden = true; // no score to share on a miss
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
    ratingEl.textContent = getRating(ms);
    ratingEl.hidden = false;
    resultActionsEl.hidden = false;
    shareBtn.hidden = false; // there's now a score worth sharing
    playArea.setAttribute("aria-label", "Reaction time " + ms + " milliseconds");

    // Load the top-100 leaderboard for this game. Errors are shown inline
    // and don't block the result screen.
    loadLeaderboardRT(ms);
  }

  function escapeHtmlRT(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function renderLbRowsRT(targetEl, rows, currentNickname) {
    if (!rows || rows.length === 0) {
      targetEl.innerHTML = '<li class="lb-empty">No scores yet. Be the first!</li>';
      return;
    }
    const parts = [];
    const lcNick = (currentNickname || "").toLowerCase();
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const isYou = lcNick && (r.nickname || "").toLowerCase() === lcNick;
      const value = window.Leaderboard.formatGameValue("reaction-timer", r);
      parts.push(
        '<li class="' + (isYou ? "is-you" : "") + '">' +
          '<span class="lb-rank">#' + (i + 1) + '</span>' +
          '<span class="lb-name">' + escapeHtmlRT(r.nickname || "") + '</span>' +
          '<span class="lb-value">' + escapeHtmlRT(value) + '</span>' +
        '</li>'
      );
    }
    targetEl.innerHTML = parts.join("");
  }

  let lastSubmittedNickRT = "";

  function loadLeaderboardRT() {
    lbListRT.setAttribute("aria-busy", "true");
    lbListRT.innerHTML = '<li class="lb-empty">Loading…</li>';
    window.Leaderboard.fetchTop100("reaction-timer").then(function (res) {
      lbListRT.setAttribute("aria-busy", "false");
      if (res.error) {
        lbListRT.innerHTML = '<li class="lb-error">Couldn\'t load leaderboard.</li>';
        return;
      }
      const currentNick = (lbNicknameRT && lbNicknameRT.value || "").trim() || lastSubmittedNickRT;
      renderLbRowsRT(lbListRT, res.data, currentNick);
    });
  }

  function handleSubmitRT() {
    const nick = (lbNicknameRT.value || "").trim();
    if (nick.length < 1 || nick.length > 12) {
      lbStatusRT.textContent = "Nickname must be 1-12 characters.";
      lbStatusRT.classList.add("is-error");
      return;
    }
    lbStatusRT.classList.remove("is-error");
    lbStatusRT.textContent = "Submitting…";
    lbSubmitRT.disabled = true;
    window.Leaderboard.submitScore({
      game: "reaction-timer",
      nickname: nick,
      reactionTime: lastMs,
    }).then(function (res) {
      lbSubmitRT.disabled = false;
      if (res.ok) {
        lastSubmittedNickRT = nick;
        lbStatusRT.classList.remove("is-error");
        lbStatusRT.textContent = "✓ Submitted!";
        loadLeaderboardRT();
      } else {
        lbStatusRT.classList.add("is-error");
        lbStatusRT.textContent = "Couldn't submit — try again.";
      }
    });
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

  function handleShare() {
    if (lastMs == null) return; // nothing to share yet
    const text = buildShareText();
    copyToClipboard(text).then(
      function () { showCopiedToast("Copied to clipboard!"); },
      function () { showCopiedToast("Couldn't copy — try again"); }
    );
  }

  function handleResetBest() {
    const ok = window.confirm("Reset best reaction time and tries?");
    if (!ok) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    bestMs = null;
    tries = 0;
    renderStats();
    // If we're sitting on a result, refresh its label — the cleared best
    // means the player no longer holds a "new best" for the just-shown time.
    if (state === "result" && lastMs != null) {
      bestMs = null;
      // If lastMs was being shown as a new best, demote it to "Your time".
      messageEl.textContent = "Your time";
    }
    showCopiedToast("Best reset");
  }

  // --- Init ---
  function init() {
    renderStats();
    showIdle();

    // The playArea is a <button> and CSS sets touch-action: manipulation
    // on it, so the browser does not impose a 300ms double-tap delay and
    // click fires for both mouse and touch.
    playArea.addEventListener("click", handlePlayAreaClick);
    tryAgainBtn.addEventListener("click", function (e) {
      e.preventDefault();
      handleTryAgain();
    });
    shareBtn.addEventListener("click", function (e) {
      e.preventDefault();
      handleShare();
    });
    if (resetBestBtn) resetBestBtn.addEventListener("click", handleResetBest);
    if (lbSubmitRT) lbSubmitRT.addEventListener("click", handleSubmitRT);
  }

  init();
})();
