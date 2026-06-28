# Coffee Escape "Coming soon" gate + Supabase accounts

Single commit. Five new files, four modified.

## 1. `auth-config.js` (new)

Tiny global so the dev email can be edited without touching other files.
- `window.AUTH_DEV_EMAILS = ["bhspider30@gmail.com"]`

The dev list is matched case-insensitively against the signed-in user's
email. Anyone not on the list sees "Coming soon" for Coffee Escape.

## 2. `auth-client.js` (new)

A small wrapper around Supabase Auth (the existing `@supabase/supabase-js@2`
CDN already loaded by every page that uses Supabase).

Public API on `window.Auth`:
- `Auth.signUp(email, password, nickname)` → `{ok, error, needsConfirm}`
- `Auth.signIn(email, password)` → `{ok, error}`
- `Auth.signOut()` → `{ok, error}`
- `Auth.getSession()` → `Promise<session | null>`
- `Auth.getUser()` → `Promise<{email, nickname} | null>`
- `Auth.onChange(callback)` → unsubscribe function

Behavior:
- Uses `supabase.auth.signUp` with `email`, `password`, and stores the
  1–12 char nickname in `options.data.nickname` (user_metadata).
- `signIn` calls `supabase.auth.signInWithPassword`.
- Persists session in localStorage (Supabase's default; the existing
  leaderboard client has `persistSession: false` for its own client,
  so the auth client needs its own `createClient` with persistSession
  enabled).
- `getUser` reads `session.user` and pulls `email` + `user_metadata.nickname`.
- `onChange` subscribes to `supabase.auth.onAuthStateChange` and invokes
  the callback with the same shape `getUser` returns.

## 3. `account.html` (new)

Sign-up / Log-in page. Two tabs (CSS-only toggle via :checked + label).
- Sign Up: email, password (min 6 chars), nickname (1–12 chars).
- Log In: email, password.
- Inline error messages.
- On success: redirect to `index.html` (the arcade).
- Footer: Support button + Back to Arcade pill.

Uses the same `.btn`, `.btn-primary`, `.btn-secondary`, `.footer`,
`.arcade-back-pill`, `.header`, `.app` classes that the rest of the
arcade uses — no new styles needed except minor layout for the form
fields and tabs. Adds one small `<style>` block inline at the top.

## 4. `index.html` (modified)

Changes:
- **Replace the playable Coffee Escape card with a disabled "Coming
  soon" tile.** Same shape/size as the other cards but no link; uses
  the existing `.game-card` class. A new inline `<style>` adds a
  `.game-card--coming-soon` variant that grays the card and replaces
  the button with a "Coming soon" badge.
- **Add an account banner** between the header and the game grid:
  - When signed out: "Make an account to save scores across devices"
    with **Sign Up** and **Log In** buttons linking to `account.html`.
  - When signed in: "Hi, {nickname}" with a **Sign Out** button.
- **Add a small inline `<script>`** (loaded after `auth-client.js` and
  `auth-config.js`) that:
  1. On page load, calls `Auth.getUser()`.
  2. If user is signed in: replaces the banner with the signed-in
     version; if `Auth.isDev()` (email in dev list) is also true,
     swaps the Coffee Escape coming-soon card for a playable card
     (rebuilt in JS so the static HTML stays clean — no Coffee
     Escape card in the markup at all).
  3. If user is signed out: keeps the banner as-is, leaves Coffee
     Escape as "Coming soon".
  4. Listens to `Auth.onChange` so banner / card update live on
     sign-in / sign-out.
- A new `Auth.isDev()` helper goes in `auth-client.js`.

## 5. `coffee-escape.html` and `coffee-escape.js` (modified)

- Bump footer version to "Coffee Escape v1.2".
- README and TODO get one-line updates noting the gate and accounts.

## 6. Scripts on `index.html`

Load order in `<body>`:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase-config.js"></script>
<script src="auth-config.js"></script>
<script src="auth-client.js"></script>
<script src="auth-gate.js"></script>  <!-- new, handles the banner + card swap -->
```

`auth-gate.js` is a new tiny file (~50 lines) that just wires up the
banner and the dev card swap. It calls into `Auth` only — no Supabase
imports. Keeping it separate from `auth-client.js` means other pages
could load `auth-client.js` without pulling in the gate logic.

## 7. Supabase setup (you do this once)

A `SUPABASE_SETUP.md` file in the repo with the exact SQL to paste
into the Supabase SQL editor. Two parts:

```sql
-- 1. Allow the nickname column on auth.users via user_metadata (already
--    automatic; no schema change needed).

-- 2. Create a public profiles table for the leaderboard to read nicknames
--    from without going through auth.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 12),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
```

I do NOT modify the existing `leaderboard_scores` table or RLS — that
will be part of the leaderboard work in the next commit.

## 8. Order of files in the commit

1. `auth-config.js`
2. `auth-client.js`
3. `account.html`
4. `auth-gate.js`
5. `index.html` (modified)
6. `coffee-escape.html` (version bump)
7. `SUPABASE_SETUP.md`
8. `README.md` (one-line update)
9. `TODO.md` (one-line update)

## 9. Risk and mitigations

- **Risk: gate breaks the homepage for everyone if Supabase is slow /
  fails to load.** Mitigation: the static HTML defaults to the
  coming-soon state. The script only UPGRADES the card to playable
  if `getUser()` succeeds and `isDev()` is true. If the script
  doesn't load at all, every visitor sees "Coming soon" — which is
  the safe default.
- **Risk: the dev email list is hardcoded in `auth-config.js`.**
  Acceptable for now — you can add more by editing one line. If
  you want it dynamic later, we can read from a Supabase table.
- **Risk: Supabase Auth requires email confirmation by default.**
  Mitigation: in `SUPABASE_SETUP.md`, document the toggle to turn
  off "Confirm email" in the Supabase Auth settings so sign-up is
  instant. Otherwise new users have to click a link in their inbox
  before they can sign in.
- **Risk: someone figures out the URL and goes to `coffee-escape.html`
  directly.** Same as every other game file. The gate is UI-only.
  If you want a hard server-side block later, that needs Vercel
  middleware or Cloudflare Workers — out of scope for this commit.
- **Risk: the existing leaderboard client uses a Supabase client
  with `persistSession: false`.** This means even after a user signs
  up, the leaderboard client doesn't see the session. Mitigation:
  the new `auth-client.js` uses its OWN Supabase client with
  `persistSession: true`. They don't share state. The leaderboard
  uses the anon key; the auth client uses the anon key with the
  extra `auth` config. Both are safe to expose.
