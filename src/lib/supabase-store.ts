import { supabase } from "@/integrations/supabase/client";
import {
  TaskStatus, DistractionTier, getAllAxisMaxScores, getAxisScore,
  getDistractionScore, getDateOffset
} from "./store";

// ===== Profile =====

export interface DbProfile {
  name: string;
  phone: string;
  email: string | null;
  primary_goal: string;
  goal_importance: string;
  axis_weights: { mental: number; physical: number; religious: number };
}

export async function getProfile(): Promise<DbProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error || !data) return null;

  return {
    name: data.name,
    phone: data.phone,
    email: data.email,
    primary_goal: data.primary_goal,
    goal_importance: data.goal_importance,
    axis_weights: data.axis_weights as { mental: number; physical: number; religious: number },
  };
}

export async function updateProfile(profile: Partial<DbProfile>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update(profile)
    .eq("user_id", user.id);
}

export async function isProfileSetup(): Promise<boolean> {
  const profile = await getProfile();
  return !!profile && !!profile.primary_goal && profile.primary_goal.length > 0;
}

// ===== Daily Logs =====

export interface DbDailyLog {
  id?: string;
  date: string;
  distraction_tier: string;
  distraction_points: number;
  distraction_istighfar: number;
  mental_status: string;
  mental_base_score: number;
  mental_deduction: number;
  mental_final_score: number;
  physical_status: string;
  physical_base_score: number;
  physical_deduction: number;
  physical_final_score: number;
  religious_status: string;
  religious_base_score: number;
  religious_deduction: number;
  religious_final_score: number;
  daily_note: string;
  total_score: number;
  consecutive_distraction: boolean;
}

export async function saveDailyLogDb(log: DbDailyLog) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Check if log exists for this date
  const { data: existing } = await supabase
    .from("daily_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("date", log.date)
    .single();

  if (existing) {
    await supabase
      .from("daily_logs")
      .update({ ...log })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("daily_logs")
      .insert({ ...log, user_id: user.id });
  }
}

export async function getDailyLogs(): Promise<DbDailyLog[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: true });

  if (error || !data) return [];
  return data as DbDailyLog[];
}

export async function getTodayLog(): Promise<DbDailyLog | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();

  if (error || !data) return null;
  return data as DbDailyLog;
}

// ===== Appended Tasks =====

export interface DbAppendedTask {
  id?: string;
  axis_type: string;
  points_to_reclaim: number;
  reclaim_percentage: number;
  created_date: string;
  expiry_date: string;
  completed: boolean;
}

export async function saveAppendedTasks(tasks: DbAppendedTask[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  for (const task of tasks) {
    await supabase
      .from("appended_tasks")
      .insert({ ...task, user_id: user.id });
  }
}

export async function getPendingAppendedTasksDb(date: string): Promise<(DbAppendedTask & { id: string })[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("appended_tasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("completed", false)
    .gte("expiry_date", date)
    .lt("created_date", date)
    .order("created_date", { ascending: true })
    .limit(3);

  if (error || !data) return [];
  return data as (DbAppendedTask & { id: string })[];
}

export async function markTaskCompleted(taskId: string) {
  await supabase
    .from("appended_tasks")
    .update({ completed: true })
    .eq("id", taskId);
}

export async function generateAndSaveAppendedTasks(
  axes: { mental: { deduction: number; finalScore: number }; physical: { deduction: number; finalScore: number }; religious: { deduction: number; finalScore: number } },
  date: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const axisTypes: Array<'mental' | 'physical' | 'religious'> = ['mental', 'physical', 'religious'];
  const tasks: DbAppendedTask[] = [];

  for (const axis of axisTypes) {
    const entry = axes[axis];
    if (entry.deduction > 0) {
      const baseScore = entry.finalScore + entry.deduction;
      const isMinor = entry.finalScore >= baseScore * 0.6;
      tasks.push({
        axis_type: axis,
        points_to_reclaim: isMinor ? Math.round(entry.deduction * 0.15) : Math.round(entry.deduction * 0.35),
        reclaim_percentage: isMinor ? 15 : 35,
        created_date: date,
        expiry_date: getDateOffset(date, 2),
        completed: false,
      });
    }
  }

  if (tasks.length > 0) {
    await saveAppendedTasks(tasks);
  }
}

// ===== Check consecutive distraction =====

export async function checkConsecutiveDistractionDb(todayDate: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const yesterday = getDateOffset(todayDate, -1);
  const { data, error } = await supabase
    .from("daily_logs")
    .select("distraction_tier")
    .eq("user_id", user.id)
    .eq("date", yesterday)
    .single();

  if (error || !data) return false;
  return data.distraction_tier !== 'none';
}
