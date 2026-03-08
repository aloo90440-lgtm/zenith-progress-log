
-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  primary_goal TEXT NOT NULL DEFAULT '',
  goal_importance TEXT NOT NULL DEFAULT '',
  axis_weights JSONB NOT NULL DEFAULT '{"mental": 50, "physical": 50, "religious": 50}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Daily logs table
CREATE TABLE public.daily_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  distraction_tier TEXT NOT NULL DEFAULT 'none',
  distraction_points INTEGER NOT NULL DEFAULT 10,
  distraction_istighfar INTEGER NOT NULL DEFAULT 0,
  mental_status TEXT NOT NULL DEFAULT 'not_done',
  mental_base_score NUMERIC NOT NULL DEFAULT 0,
  mental_deduction NUMERIC NOT NULL DEFAULT 0,
  mental_final_score NUMERIC NOT NULL DEFAULT 0,
  physical_status TEXT NOT NULL DEFAULT 'not_done',
  physical_base_score NUMERIC NOT NULL DEFAULT 0,
  physical_deduction NUMERIC NOT NULL DEFAULT 0,
  physical_final_score NUMERIC NOT NULL DEFAULT 0,
  religious_status TEXT NOT NULL DEFAULT 'not_done',
  religious_base_score NUMERIC NOT NULL DEFAULT 0,
  religious_deduction NUMERIC NOT NULL DEFAULT 0,
  religious_final_score NUMERIC NOT NULL DEFAULT 0,
  daily_note TEXT NOT NULL DEFAULT '',
  total_score NUMERIC NOT NULL DEFAULT 0,
  consecutive_distraction BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs" ON public.daily_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON public.daily_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own logs" ON public.daily_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own logs" ON public.daily_logs FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_daily_logs_updated_at BEFORE UPDATE ON public.daily_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Appended tasks table
CREATE TABLE public.appended_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  axis_type TEXT NOT NULL,
  points_to_reclaim NUMERIC NOT NULL DEFAULT 0,
  reclaim_percentage NUMERIC NOT NULL DEFAULT 0,
  created_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.appended_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.appended_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.appended_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.appended_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.appended_tasks FOR DELETE USING (auth.uid() = user_id);
