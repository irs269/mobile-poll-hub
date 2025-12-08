-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor', 'surveyor');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create surveys table
CREATE TABLE public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create survey_questions table
CREATE TABLE public.survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('single_choice', 'multiple_choice', 'text_short', 'text_long', 'numeric', 'likert', 'date')),
  options JSONB,
  is_required BOOLEAN DEFAULT true,
  order_index INTEGER NOT NULL,
  skip_logic JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create survey_assignments table
CREATE TABLE public.survey_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE NOT NULL,
  surveyor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(survey_id, surveyor_id)
);

-- Create survey_responses table
CREATE TABLE public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE NOT NULL,
  surveyor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  responses JSONB NOT NULL,
  gps_start JSONB,
  gps_end JSONB,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'supervisor'));

-- User roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Surveys policies
CREATE POLICY "Admins can manage surveys"
  ON public.surveys FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors can manage surveys"
  ON public.surveys FOR ALL
  USING (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Surveyors can view assigned surveys"
  ON public.surveys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.survey_assignments
      WHERE survey_id = surveys.id
      AND surveyor_id = auth.uid()
    )
  );

-- Survey questions policies
CREATE POLICY "Admins can manage questions"
  ON public.survey_questions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors can manage questions"
  ON public.survey_questions FOR ALL
  USING (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Surveyors can view questions for assigned surveys"
  ON public.survey_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.survey_assignments
      WHERE survey_id = survey_questions.survey_id
      AND surveyor_id = auth.uid()
    )
  );

-- Survey assignments policies
CREATE POLICY "Admins can manage assignments"
  ON public.survey_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors can manage assignments"
  ON public.survey_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Surveyors can view their own assignments"
  ON public.survey_assignments FOR SELECT
  USING (auth.uid() = surveyor_id);

-- Survey responses policies
CREATE POLICY "Surveyors can insert their own responses"
  ON public.survey_responses FOR INSERT
  WITH CHECK (auth.uid() = surveyor_id);

CREATE POLICY "Surveyors can view their own responses"
  ON public.survey_responses FOR SELECT
  USING (auth.uid() = surveyor_id);

CREATE POLICY "Surveyors can update their own responses"
  ON public.survey_responses FOR UPDATE
  USING (auth.uid() = surveyor_id);

CREATE POLICY "Admins can view all responses"
  ON public.survey_responses FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors can view all responses"
  ON public.survey_responses FOR SELECT
  USING (public.has_role(auth.uid(), 'supervisor'));

-- Create trigger for new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_surveys_updated_at
  BEFORE UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();