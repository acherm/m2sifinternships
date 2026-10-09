-- 008: Let supervisors self-register again
--
-- 006 made every new account a "student". That was right for admin/observer,
-- but supervisors are many and the role only lets them propose subjects that an
-- admin must validate anyway. From now on the signup form may choose "student"
-- or "supervisor"; anything else (admin, observer, garbage) becomes "student".
-- Admin and observer rights are still granted only from the User Management tab.
--
-- Definition change only; no rows touched. Safe to re-run.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested text := NEW.raw_user_meta_data ->> 'role';
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    CASE WHEN requested IN ('student', 'supervisor') THEN requested ELSE 'student' END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Direct inserts through the API follow the same rule.
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id AND role IN ('student', 'supervisor'));
