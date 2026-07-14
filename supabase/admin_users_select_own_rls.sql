-- Harden public.admin_users for client admin detection.
-- Run in Supabase SQL Editor if RLS is still open / missing policies.
--
-- Goal:
-- - Authenticated users can SELECT only their own row (user_id = auth.uid()).
-- - No client INSERT / UPDATE / DELETE (assign roles in dashboard / service role).
-- - Anon cannot read the table.
-- - App fails closed when no row / query error.

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_users FROM anon;
REVOKE ALL ON TABLE public.admin_users FROM authenticated;
GRANT SELECT ON TABLE public.admin_users TO authenticated;

DROP POLICY IF EXISTS "admin_users_select_own" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can read own row" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_select" ON public.admin_users;

CREATE POLICY "admin_users_select_own"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Optional check (should return your owner row when run as that user):
-- select user_id, role from public.admin_users where user_id = auth.uid();
