/* CodeCup Arcade — Supabase Auth wrapper.
 *
 * Depends on (loaded in this order by every page that uses auth):
 *   1. <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   2. <script src="supabase-config.js"></script>      // sets window.SUPABASE_URL/_ANON_KEY
 *   3. <script src="auth-config.js"></script>          // sets window.AUTH_DEV_EMAILS
 *   4. <script src="auth-client.js"></script>          // this file
 *
 * Exposes a single global: window.Auth.
 * Only the publishable / anon key is ever used. No service_role key.
 *
 * The Supabase client created here has persistSession = true so the
 * user stays signed in across page reloads. This is intentionally
 * separate from the leaderboard client (which has persistSession =
 * false because it doesn't need to know who you are).
 */

(function () {
  "use strict";

  // --- Supabase client (lazy, single instance) ---
  let _client = null;
  function getClient() {
    if (_client) return _client;
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
      throw new Error("Supabase config missing. Make sure supabase-config.js is loaded before auth-client.js.");
    }
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error("Supabase JS client not loaded. Make sure the @supabase/supabase-js CDN script is included before auth-client.js.");
    }
    _client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    return _client;
  }

  // --- Helpers ---
  function getNickname(user) {
    if (!user) return null;
    const meta = user.user_metadata || {};
    if (typeof meta.nickname === "string" && meta.nickname.length > 0) return meta.nickname;
    // Fall back to the part of the email before the @
    if (user.email) return user.email.split("@")[0].slice(0, 12);
    return "player";
  }

  function shapeUser(user) {
    if (!user) return null;
    return {
      email: user.email || null,
      nickname: getNickname(user),
    };
  }

  // --- Public API ---

  // Sign up with email + password + nickname. Nickname is stored in
  // user_metadata.nickname (1-12 chars). Returns { ok, error, needsConfirm }.
  async function signUp(email, password, nickname) {
    try {
      const cleanEmail = (email || "").trim();
      if (!cleanEmail || !cleanEmail.includes("@")) {
        return { ok: false, error: new Error("Please enter a valid email.") };
      }
      if (!password || password.length < 6) {
        return { ok: false, error: new Error("Password must be at least 6 characters.") };
      }
      const cleanNick = (nickname || "").trim();
      if (cleanNick.length < 1 || cleanNick.length > 12) {
        return { ok: false, error: new Error("Nickname must be 1-12 characters.") };
      }
      const sb = getClient();
      const { data, error } = await sb.auth.signUp({
        email: cleanEmail,
        password: password,
        options: { data: { nickname: cleanNick } },
      });
      if (error) return { ok: false, error };
      // If Supabase requires email confirmation, data.session will be null
      // but data.user will be present.
      return {
        ok: true,
        error: null,
        needsConfirm: !data.session,
        user: shapeUser(data.user),
      };
    } catch (err) {
      return { ok: false, error: err };
    }
  }

  // Sign in with email + password. Returns { ok, error }.
  async function signIn(email, password) {
    try {
      const cleanEmail = (email || "").trim();
      if (!cleanEmail || !password) {
        return { ok: false, error: new Error("Email and password are required.") };
      }
      const sb = getClient();
      const { data, error } = await sb.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });
      if (error) return { ok: false, error };
      return { ok: true, error: null, user: shapeUser(data.user) };
    } catch (err) {
      return { ok: false, error: err };
    }
  }

  // Sign out. Returns { ok, error }.
  async function signOut() {
    try {
      const sb = getClient();
      const { error } = await sb.auth.signOut();
      if (error) return { ok: false, error };
      return { ok: true, error: null };
    } catch (err) {
      return { ok: false, error: err };
    }
  }

  // Returns the current session (or null).
  async function getSession() {
    try {
      const sb = getClient();
      const { data } = await sb.auth.getSession();
      return data.session || null;
    } catch (err) {
      return null;
    }
  }

  // Returns { email, nickname } for the current user, or null.
  async function getUser() {
    try {
      const sb = getClient();
      const { data } = await sb.auth.getUser();
      return shapeUser(data.user);
    } catch (err) {
      return null;
    }
  }

  // Subscribe to auth state changes. The callback receives
  // { email, nickname } | null. Returns an unsubscribe function.
  function onChange(callback) {
    try {
      const sb = getClient();
      const { data } = sb.auth.onAuthStateChange(function (_event, session) {
        const u = session && session.user;
        callback(shapeUser(u));
      });
      return function () {
        if (data && data.subscription && data.subscription.unsubscribe) {
          data.subscription.unsubscribe();
        }
      };
    } catch (err) {
      return function () {};
    }
  }

  // Returns true if the given email (or the current user's email) is
  // in the dev list. Case-insensitive.
  function isDev(email) {
    const list = (window.AUTH_DEV_EMAILS || []).map(function (e) {
      return String(e).toLowerCase();
    });
    if (email) {
      return list.indexOf(String(email).toLowerCase()) !== -1;
    }
    // No email passed — check the current user.
    return getUser().then(function (u) {
      if (!u || !u.email) return false;
      return list.indexOf(String(u.email).toLowerCase()) !== -1;
    });
  }

  // --- Expose ---
  window.Auth = {
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    getSession: getSession,
    getUser: getUser,
    onChange: onChange,
    isDev: isDev,
  };
})();
