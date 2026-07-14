-- CodeCup Auth MVP — run once in Supabase SQL Editor
-- Project: coffee rush (lsvctdcydndfdncbvneq)
-- Safe: guests keep working (user_id null); logged-in rows may set user_id = auth.uid()

-- 1) Optional user link on scores (nullable for guests)
ALTER TABLE public.leaderboard_scores
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS leaderboard_scores_user_id_idx
  ON public.leaderboard_scores (user_id);

-- 2) profiles already exists (id → auth.users). Ensure RLS stays on.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3) Leaderboard: allow both anon (guest) and authenticated (logged-in)
DROP POLICY IF EXISTS "Anyone can read leaderboard scores" ON public.leaderboard_scores;
CREATE POLICY "Anyone can read leaderboard scores"
ON public.leaderboard_scores
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Anyone can submit leaderboard scores" ON public.leaderboard_scores;
CREATE POLICY "Anyone can submit leaderboard scores"
ON public.leaderboard_scores
FOR INSERT
TO public
WITH CHECK (
  (char_length(TRIM(BOTH FROM nickname)) >= 1)
  AND (char_length(TRIM(BOTH FROM nickname)) <= 12)
  AND (nickname ~ '^[A-Za-z0-9 _-]+$')
  AND (
    game = ANY (ARRAY[
      'coffee-rush'::text,
      'reaction-timer'::text,
      'memory-match'::text,
      'math-rush'::text,
      'coffee-escape'::text
    ])
  )
  AND (
    (
      game = ANY (ARRAY['coffee-rush'::text, 'math-rush'::text, 'coffee-escape'::text])
      AND score IS NOT NULL
      AND score >= 0
    )
    OR (
      game = 'reaction-timer'::text
      AND reaction_time IS NOT NULL
      AND reaction_time > 0
    )
    OR (
      game = 'memory-match'::text
      AND moves IS NOT NULL
      AND moves > 0
      AND time_seconds IS NOT NULL
      AND time_seconds > 0
    )
  )
  -- Guests: user_id must be null. Logged-in: must match JWT uid (no spoofing).
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- 4) Profiles policies (idempotent re-create)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT TO public
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO public
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
