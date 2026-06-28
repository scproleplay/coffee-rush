/* CodeCup Arcade — homepage auth gate.
 *
 * Wired up by index.html. Reads the current user from window.Auth and:
 *   - Updates the account banner (sign-in / signed-in state).
 *   - If the signed-in user is a dev, swaps the Coffee Escape
 *     "Coming soon" tile for a playable card.
 *
 * Safe to load when Supabase is unavailable: if Auth.getUser() fails,
 * the page simply shows the signed-out banner and the coming-soon
 * tile (which is the safe default).
 */

(function () {
  "use strict";

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === "class") node.className = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else node.setAttribute(k, attrs[k]);
      }
    }
    if (text != null) node.textContent = text;
    return node;
  }

  function renderSignedOut(banner) {
    banner.innerHTML = "";
    banner.appendChild(el("span", { class: "auth-banner-text" },
      "Make an account to save scores across devices."));
    var actions = el("div", { class: "auth-banner-actions" });
    var up = el("a", { class: "btn btn-primary", href: "account.html" }, "Sign Up");
    var inb = el("a", { class: "btn btn-secondary", href: "account.html" }, "Log In");
    actions.appendChild(up);
    actions.appendChild(inb);
    banner.appendChild(actions);
  }

  function renderSignedIn(banner, user, isDev) {
    banner.innerHTML = "";
    var greeting = isDev
      ? "Hi, " + user.nickname + " — you have dev access."
      : "Hi, " + user.nickname + ".";
    banner.appendChild(el("span", { class: "auth-banner-text" }, greeting));
    var actions = el("div", { class: "auth-banner-actions" });
    var out = el("button", { class: "btn btn-secondary", type: "button" }, "Sign Out");
    out.addEventListener("click", function () {
      window.Auth.signOut().then(function () { window.location.reload(); });
    });
    actions.appendChild(out);
    banner.appendChild(actions);
  }

  function swapToPlayableCard(slot) {
    // Replace the static "Coming soon" tile with a playable card.
    slot.innerHTML = "";
    slot.className = "game-card game-card--dev";
    var emoji = el("div", { class: "game-card-emoji" }, "☕🏃");
    var name = el("h2", { class: "game-card-name" }, "Coffee Escape");
    var desc = el("p", { class: "game-card-desc" },
      "Run through the house and jump over furniture before the tired man catches you.");
    var badge = el("div", { class: "game-card-dev-badge" }, "DEV ACCESS");
    var link = el("a", {
      class: "btn btn-primary",
      href: "coffee-escape.html",
      "aria-label": "Play Coffee Escape",
    }, "Play Coffee Escape");
    slot.appendChild(emoji);
    slot.appendChild(name);
    slot.appendChild(desc);
    slot.appendChild(badge);
    slot.appendChild(link);
  }

  function apply(user) {
    var banner = document.getElementById("authBanner");
    var slot = document.getElementById("ceCardSlot");
    if (!banner || !slot) return;
    if (!user || !user.email) {
      renderSignedOut(banner);
      // Slot stays as the static "Coming soon" tile.
      return;
    }
    Promise.resolve(window.Auth.isDev(user.email)).then(function (dev) {
      renderSignedIn(banner, user, dev);
      if (dev) swapToPlayableCard(slot);
    });
  }

  function init() {
    if (!window.Auth) return; // Supabase failed to load — stay default.
    var banner = document.getElementById("authBanner");
    var slot = document.getElementById("ceCardSlot");
    if (!banner || !slot) return;

    // Apply current state, then subscribe to changes.
    window.Auth.getUser().then(function (u) { apply(u); });
    window.Auth.onChange(function (u) { apply(u); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
