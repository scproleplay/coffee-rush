# Supabase setup for CodeCup Arcade accounts

This file describes the one-time Supabase configuration required to
run the CodeCup Arcade accounts system and the Coffee Escape
"Coming soon" gate. **Run each step once.** The site works without
it (everyone sees the "Coming soon" tile) but accounts won't.

The project is the existing one in `supabase-config.js`:
`https://lsvctdcydndfdncbvneq.supabase.co`.

## 1. Allow new sign-ups without email confirmation (recommended)

By default Supabase sends a confirmation email before a new account
can sign in. For a small public arcade you probably want sign-up to
be instant, so visitors can play right away.

- In the Supabase dashboard, go to **Authentication → Providers → Email**.
- Toggle **Confirm email** OFF.
- Save.

If you prefer to keep email confirmation on (better security), the
sign-up form will tell users "check your email" and they have to
click the link before logging in. Either is fine — the code handles
both.

## 2. Create the `profiles` table

The `auth.users` table holds the email and password hash. We also
need a public `profiles` table for the nickname, so the leaderboard
(and any other code) can read nicknames without going through the
auth schema.

In the Supabase dashboard, go to **SQL Editor → New query** and run:

```sql
-- Public profiles table. One row per signed-in user, holding the
-- nickname they chose at sign-up. The leaderboard will read from
-- here in a future change.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 12),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Row Level Security: anyone can read nicknames (so the leaderboard
-- can show them), but only the row's owner can insert or update.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
```

After running this, new sign-ups will work end-to-end. The
`auth-client.js` script stores the nickname in `user_metadata`, and
the next leaderboard update will move it into `profiles` so the
leaderboard can join.

## 3. Verify the dev bypass

To check that the gate works for your dev account:

1. Open `account.html` and sign up with `bhspider30@gmail.com` (or
   sign in if you already created it).
2. Return to `index.html` (the arcade homepage).
3. The Coffee Escape card should now read **"DEV ACCESS"** in green
   with a **Play Coffee Escape** button.

To add another dev, edit `auth-config.js` and add the email to the
`AUTH_DEV_EMAILS` array. No rebuild needed — just push the change.

## 4. (Optional) Restrict who can sign up

By default anyone can sign up. To require an allowlist:

- In the Supabase dashboard, go to **Authentication → Sign In / Up**.
- Toggle **Allow new users to sign up** OFF.
- Add the dev account(s) manually in **Authentication → Users →
  Add user**.

This is optional and only useful if you want to keep the arcade
private while testing.
