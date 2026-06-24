/* Global leaderboard page. Tab UI + top-100 fetch per game. */

(function () {
  "use strict";

  const GAMES = [
    { key: "coffee-rush",    label: "Coffee Rush" },
    { key: "reaction-timer", label: "Reaction Timer" },
    { key: "memory-match",   label: "Memory Match" },
    { key: "math-rush",      label: "Math Rush" },
  ];

  const tabs = document.querySelectorAll(".lb-tab");
  const list = document.getElementById("lbList");

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function renderRows(rows, game) {
    if (!rows || rows.length === 0) {
      list.innerHTML = '<li class="lb-empty">No scores yet. Be the first!</li>';
      return;
    }
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rank = i + 1;
      const value = window.Leaderboard.formatGameValue(game, r);
      out.push(
        '<li>' +
          '<span class="lb-rank">#' + rank + '</span>' +
          '<span class="lb-name">' + escapeHtml(r.nickname || "") + '</span>' +
          '<span class="lb-value">' + escapeHtml(value) + '</span>' +
        '</li>'
      );
    }
    list.innerHTML = out.join("");
  }

  function renderError(message) {
    list.innerHTML = '<li class="lb-error">' + escapeHtml(message) + '</li>';
  }

  function setActiveTab(game) {
    tabs.forEach(function (t) {
      const isActive = t.getAttribute("data-game") === game;
      t.classList.toggle("is-active", isActive);
      t.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  async function loadGame(game) {
    setActiveTab(game);
    list.setAttribute("aria-busy", "true");
    list.innerHTML = '<li class="lb-empty">Loading…</li>';
    const res = await window.Leaderboard.fetchTop100(game);
    list.setAttribute("aria-busy", "false");
    if (res.error) {
      renderError("Couldn't load leaderboard — try again later.");
      return;
    }
    renderRows(res.data, game);
  }

  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      loadGame(t.getAttribute("data-game"));
    });
  });

  // Initial load: Coffee Rush tab.
  loadGame("coffee-rush");
})();
