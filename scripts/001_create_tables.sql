-- Create user profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('supervisor', 'admin', 'student')) DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create internship subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  pdf_url TEXT,
  team_info TEXT NOT NULL,
  main_supervisor_name TEXT NOT NULL,
  main_supervisor_email TEXT NOT NULL,
  co_supervisors_names TEXT NOT NULL,
  co_supervisors_emails TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'validated', 'needs_modification', 'refused')) DEFAULT 'pending',
  admin_comment TEXT,
  supervisor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create student choices table
CREATE TABLE IF NOT EXISTS public.student_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  choice_rank INTEGER NOT NULL CHECK (choice_rank IN (1, 2, 3)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, choice_rank),
  UNIQUE(student_id, subject_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_choices ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Subjects policies
CREATE POLICY "Supervisors can view their own subjects" ON public.subjects
  FOR SELECT USING (auth.uid() = supervisor_id);

CREATE POLICY "Supervisors can insert their own subjects" ON public.subjects
  FOR INSERT WITH CHECK (auth.uid() = supervisor_id);

CREATE POLICY "Supervisors can update their own subjects" ON public.subjects
  FOR UPDATE USING (auth.uid() = supervisor_id);

CREATE POLICY "Students can view validated subjects" ON public.subjects
  FOR SELECT USING (status = 'validated');

CREATE POLICY "Admins can view all subjects" ON public.subjects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all subjects" ON public.subjects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Student choices policies
CREATE POLICY "Students can view their own choices" ON public.student_choices
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own choices" ON public.student_choices
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own choices" ON public.student_choices
  FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Students can delete their own choices" ON public.student_choices
  FOR DELETE USING (auth.uid() = student_id);

CREATE POLICY "Admins can view all student choices" ON public.student_choices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
