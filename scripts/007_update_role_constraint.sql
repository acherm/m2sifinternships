-- Update the role constraint to include 'observer'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('supervisor', 'admin', 'student', 'observer'));
