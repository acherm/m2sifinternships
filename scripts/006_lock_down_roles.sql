-- 006: Lock down role assignment
--
-- Before this migration, the role of a new account was copied from the signup
-- form (user metadata), and any user could change their own role through the
-- profiles update policy. Both allowed anyone to become an admin.
--
-- This migration:
--   1. Makes every new account a "student", whatever the signup form sent.
--   2. Forbids users from changing their own role. Admins promote users via
--      the app's admin API, which uses the service role and bypasses RLS.
--
-- It changes definitions only. No rows are read, written, or deleted.
-- Safe to run more than once.

-- 1. New accounts are always students.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    'student'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2. Users may edit their own profile but not their role.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

-- 3. Same rule for the insert path (the trigger inserts with SECURITY DEFINER,
--    so this only affects direct inserts through the API).
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id AND role = 'student');
