/* Shared Supabase leaderboard client for CodeCup Arcade.
 *
 * Depends on (loaded in this order by every page that uses this):
 *   1. <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   2. <script src="supabase-config.js"></script>      // sets window.SUPABASE_URL/_ANON_KEY
 *   3. <script src="leaderboard-client.js"></script>   // this file
 *
 * Exposes a single global: window.Leaderboard.
 * Only the publishable / anon key is ever used. No service_role key.
 */

(function () {
  "use strict";

  // --- Supabase client (lazy, single instance) ---
  let _client = null;
  function getClient() {
    if (_client) return _client;
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
      throw new Error("Supabase config missing. Make sure supabase-config.js is loaded before leaderboard-client.js.");
    }
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error("Supabase JS client not loaded. Make sure the @supabase/supabase-js CDN script is included before leaderboard-client.js.");
    }
    _client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return _client;
  }

  // --- Per-game sort + filter for the top 100 query ---
  // Returns { column, ascending, nullsFilter } used by fetchTop100.
  function getSortForGame(game) {
    switch (game) {
      case "coffee-rush":
        return { column: "score", ascending: false, nullsFilter: null };
      case "reaction-timer":
        // Lowest reaction_time wins. Ignore rows where reaction_time wasn't recorded.
        return { column: "reaction_time", ascending: true, nullsFilter: "reaction_time" };
      case "memory-match":
        // Lowest moves wins; tie-break on lowest time_seconds.
        // Supabase order supports multiple columns.
        return { column: "moves", ascending: true, secondary: { column: "time_seconds", ascending: true }, nullsFilter: null };
      case "math-rush":
        return { column: "score", ascending: false, nullsFilter: null };
      case "coffee-escape":
        // Highest score (best run distance) wins. Same column as
        // coffee-rush and math-rush.
        return { column: "score", ascending: false, nullsFilter: null };
      default:
        throw new Error("Unknown game: " + game);
    }
  }

  // --- fetchTop100(game) ---
  // Returns { data: [...rows], error }.
  async function fetchTop100(game) {
    try {
      const sort = getSortForGame(game);
      const sb = getClient();
      let query = sb.from("leaderboard_scores").select("*").eq("game", game).limit(100);
      if (sort.nullsFilter) {
        // PostgREST "not.<col>.is.null" — only include rows where the sort column is set.
        query = query.not(sort.nullsFilter, "is", null);
      }
      query = query.order(sort.column, { ascending: sort.ascending });
      if (sort.secondary) {
        query = query.order(sort.secondary.column, { ascending: sort.secondary.ascending });
      }
      const { data, error } = await query;
      if (error) return { data: [], error };
      return { data: data || [], error: null };
    } catch (err) {
      return { data: [], error: err };
    }
  }

  // --- submitScore(payload) ---
  // payload: { game, nickname, score?, reactionTime?, moves?, timeSeconds? }
  // Returns { ok, error }.
  async function submitScore(payload) {
    try {
      const nickname = (payload.nickname || "").trim();
      if (
        payload.game !== "coffee-rush" &&
        payload.game !== "reaction-timer" &&
        payload.game !== "memory-match" &&
        payload.game !== "math-rush" &&
        payload.game !== "coffee-escape"
      ) {
        return { ok: false, error: new Error("Unknown game.") };
      }
      if (nickname.length < 1 || nickname.length > 12) {
        return { ok: false, error: new Error("Nickname must be 1-12 characters.") };
      }
      const row = {
        game: payload.game,
        nickname: nickname,
      };
      if (typeof payload.score === "number" && Number.isFinite(payload.score)) row.score = payload.score;
      if (typeof payload.reactionTime === "number" && Number.isFinite(payload.reactionTime)) row.reaction_time = payload.reactionTime;
      if (typeof payload.moves === "number" && Number.isFinite(payload.moves)) row.moves = payload.moves;
      if (typeof payload.timeSeconds === "number" && Number.isFinite(payload.timeSeconds)) row.time_seconds = payload.timeSeconds;

      const sb = getClient();
      const { error } = await sb.from("leaderboard_scores").insert([row]);
      if (error) return { ok: false, error };
      return { ok: true, error: null };
    } catch (err) {
      return { ok: false, error: err };
    }
  }

  // --- formatGameValue(game, row) ---
  // Returns a human-readable string for the leaderboard row's "value" column.
  function formatGameValue(game, row) {
    if (game === "coffee-rush" || game === "math-rush" || game === "coffee-escape") {
      return (row.score == null ? "—" : String(row.score));
    }
    if (game === "reaction-timer") {
      return (row.reaction_time == null ? "—" : row.reaction_time + " ms");
    }
    if (game === "memory-match") {
      const moves = row.moves == null ? "—" : row.moves + (row.moves === 1 ? " move" : " moves");
      const t = row.time_seconds == null ? "" : " · " + formatTimeSeconds(row.time_seconds);
      return moves + t;
    }
    return "—";
  }

  function formatTimeSeconds(ms) {
    if (ms == null) return "";
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return pad2(m) + ":" + pad2(s);
  }
  function pad2(n) { return n < 10 ? "0" + n : String(n); }

  // --- Public API ---
  window.Leaderboard = {
    getClient: getClient,
    fetchTop100: fetchTop100,
    submitScore: submitScore,
    formatGameValue: formatGameValue,
  };
})();
