-- Allow admins to view all profiles (needed for admin user management and joins)
CREATE POLICY IF NOT EXISTS "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


