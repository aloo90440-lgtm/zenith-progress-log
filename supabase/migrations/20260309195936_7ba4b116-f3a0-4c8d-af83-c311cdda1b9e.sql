
ALTER TABLE public.appended_tasks ADD COLUMN IF NOT EXISTS split_days integer DEFAULT 1;
ALTER TABLE public.appended_tasks ADD COLUMN IF NOT EXISTS current_day integer DEFAULT 1;
ALTER TABLE public.appended_tasks ADD COLUMN IF NOT EXISTS cancelled boolean DEFAULT false;
ALTER TABLE public.appended_tasks ADD COLUMN IF NOT EXISTS task_type text DEFAULT 'recovery';
ALTER TABLE public.appended_tasks ADD COLUMN IF NOT EXISTS istighfar_minutes integer DEFAULT 0;
ALTER TABLE public.appended_tasks ADD COLUMN IF NOT EXISTS parent_task_id uuid;
ALTER TABLE public.appended_tasks ADD COLUMN IF NOT EXISTS original_points numeric DEFAULT 0;
