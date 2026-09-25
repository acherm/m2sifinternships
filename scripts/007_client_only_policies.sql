-- 007: Policies for the browser-only architecture
--
-- The app no longer has a server: the browser talks to Supabase directly with
-- the user's session, and these row-level-security policies are the whole
-- authorization model. This script adds what the server used to do with the
-- service-role key. Definitions only; no rows are touched. Safe to re-run.
--
-- Requires 006_lock_down_roles.sql to have been run first.

-- ---------------------------------------------------------------------------
-- 0. Helper: the caller's role, read without going through RLS.
--    Used inside policies on "profiles" itself, where a plain subquery would
--    be blocked by the profiles select policy (or recurse).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM public;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------------

-- Admins and observers see everyone (user list, names in choices/assignments).
DROP POLICY IF EXISTS "Admins and observers can view all profiles" ON public.profiles;
CREATE POLICY "Admins and observers can view all profiles" ON public.profiles
  FOR SELECT USING (public.current_user_role() IN ('admin', 'observer'));

-- Admins change roles. An admin cannot demote themself.
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE
  USING (public.current_user_role() = 'admin')
  WITH CHECK (
    public.current_user_role() = 'admin'
    AND (id <> auth.uid() OR role = 'admin')
  );

-- Admins delete accounts, never their own.
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (public.current_user_role() = 'admin' AND id <> auth.uid());

-- ---------------------------------------------------------------------------
-- 2. subjects
-- ---------------------------------------------------------------------------

-- A supervisor may edit their own subject, but the result must be "pending":
-- only admins validate or refuse.
DROP POLICY IF EXISTS "Supervisors can update their own subjects" ON public.subjects;
CREATE POLICY "Supervisors can update their own subjects" ON public.subjects
  FOR UPDATE
  USING (auth.uid() = supervisor_id)
  WITH CHECK (auth.uid() = supervisor_id AND status = 'pending');

-- Admins may also submit subjects on behalf of the team (they become the owner).
-- (Already covered by "Supervisors can insert their own subjects": supervisor_id = auth.uid().)

-- ---------------------------------------------------------------------------
-- 3. assignments: the admin who inserts is recorded as assigned_by.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can insert assignments" ON public.assignments;
CREATE POLICY "Admins can insert assignments" ON public.assignments
  FOR INSERT WITH CHECK (public.current_user_role() = 'admin' AND assigned_by = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. storage: bucket "subject-pdfs"
--    Supervisors and admins upload into a folder named after their own user id.
--    Any logged-in user can read (signed URLs are generated in the browser).
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('subject-pdfs', 'subject-pdfs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Supervisors and admins upload subject pdfs" ON storage.objects;
CREATE POLICY "Supervisors and admins upload subject pdfs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'subject-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.current_user_role() IN ('supervisor', 'admin')
  );

DROP POLICY IF EXISTS "Authenticated users read subject pdfs" ON storage.objects;
CREATE POLICY "Authenticated users read subject pdfs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'subject-pdfs');

-- ---------------------------------------------------------------------------
-- Check (optional): list the policies now in place.
-- ---------------------------------------------------------------------------
-- SELECT schemaname, tablename, policyname, cmd FROM pg_policies
-- WHERE schemaname IN ('public','storage') ORDER BY 1,2,4,3;
