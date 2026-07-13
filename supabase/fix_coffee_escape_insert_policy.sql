-- Run in Supabase Dashboard → SQL Editor (project: coffee rush / lsvctdcydndfdncbvneq)
-- Purpose: allow guest INSERT for game = 'coffee-escape' (reads already work).
-- Safe: only replaces the anon INSERT policy on public.leaderboard_scores.

DROP POLICY IF EXISTS "Anyone can submit leaderboard scores" ON public.leaderboard_scores;

CREATE POLICY "Anyone can submit leaderboard scores"
ON public.leaderboard_scores
FOR INSERT
TO anon
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
);
