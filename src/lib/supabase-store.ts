import { supabase } from "@/integrations/supabase/client";
import {
  TaskStatus, DistractionTier, getAllAxisMaxScores, getAxisScore,
  getDistractionScore, getDateOffset, getRecoveryFactor, calcRecoveryQuantity,
  TaskInput, getUnitLabel,
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
    .from("profiles").select("*").eq("user_id", user.id).single();
  if (error || !data) return null;
  return {
    name: data.name, phone: data.phone, email: data.email,
    primary_goal: data.primary_goal, goal_importance: data.goal_importance,
    axis_weights: data.axis_weights as { mental: number; physical: number; religious: number },
  };
}

export async function updateProfile(profile: Partial<DbProfile>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update(profile).eq("user_id", user.id);
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
  distraction_type: string;
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
  const { data: existing } = await supabase
    .from("daily_logs").select("id").eq("user_id", user.id).eq("date", log.date).single();
  if (existing) {
    await supabase.from("daily_logs").update({ ...log }).eq("id", existing.id);
  } else {
    await supabase.from("daily_logs").insert({ ...log, user_id: user.id });
  }
}

export async function getDailyLogs(): Promise<DbDailyLog[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("daily_logs").select("*").eq("user_id", user.id).order("date", { ascending: true });
  if (error || !data) return [];
  return data as DbDailyLog[];
}

export async function getTodayLog(effectiveDate: string): Promise<DbDailyLog | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("daily_logs").select("*").eq("user_id", user.id).eq("date", effectiveDate).single();
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
  task_desc?: string | null;
  task_quantity?: number | null;
  task_unit?: string | null;
  // New fields
  task_type?: string; // 'recovery' | 'istighfar' | 'split'
  split_days?: number;
  current_day?: number;
  cancelled?: boolean;
  istighfar_minutes?: number;
  original_points?: number;
  parent_task_id?: string | null;
}

export async function saveAppendedTasks(tasks: DbAppendedTask[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  for (const task of tasks) {
    await supabase.from("appended_tasks").insert({ ...task, user_id: user.id } as any);
  }
}

export async function getPendingAppendedTasksDb(date: string): Promise<(DbAppendedTask & { id: string })[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("appended_tasks").select("*")
    .eq("user_id", user.id)
    .eq("completed", false)
    .gte("expiry_date", date)
    .lte("created_date", getDateOffset(date, -1))
    .order("created_date", { ascending: true });
  if (error || !data) return [];
  // Filter out cancelled tasks
  return (data as any[]).filter(t => !t.cancelled) as (DbAppendedTask & { id: string })[];
}

export async function markTaskCompleted(taskId: string) {
  await supabase.from("appended_tasks").update({ completed: true }).eq("id", taskId);
}

export async function markTaskCancelled(taskId: string) {
  await supabase.from("appended_tasks").update({ cancelled: true } as any).eq("id", taskId);
}

// Cancel all remaining split tasks for a parent
export async function cancelRemainingDayTasks(parentId: string, afterDay: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data } = await supabase
    .from("appended_tasks").select("id")
    .eq("user_id", user.id)
    .eq("completed", false)
    .filter("parent_task_id" as any, "eq", parentId);
  if (data) {
    for (const t of data) {
      await supabase.from("appended_tasks").update({ cancelled: true } as any).eq("id", t.id);
    }
  }
}

/**
 * Generate recovery tasks for axes with deductions.
 * Each axis can have multiple tasks (multi-task input).
 */
export async function generateRecoveryTasks(
  axes: { mental: { deduction: number; finalScore: number; baseScore?: number }; physical: { deduction: number; finalScore: number; baseScore?: number }; religious: { deduction: number; finalScore: number; baseScore?: number } },
  date: string,
  axisTasks?: Record<string, TaskInput[]>,
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const axisTypes: Array<'mental' | 'physical' | 'religious'> = ['mental', 'physical', 'religious'];
  const tasks: DbAppendedTask[] = [];

  for (const axis of axisTypes) {
    const entry = axes[axis];
    if (entry.deduction <= 0) continue;

    const baseScore = entry.finalScore + entry.deduction;
    const isMinor = entry.finalScore >= baseScore * 0.6;
    const factor = isMinor ? 0.20 : 0.40;
    const pct = isMinor ? 20 : 40;
    const pointsToReclaim = Math.round(entry.deduction * factor);

    const inputTasks = axisTasks?.[axis] || [];
    
    if (inputTasks.length > 0) {
      // Multiple tasks per axis
      const pointsPerTask = Math.max(1, Math.round(pointsToReclaim / inputTasks.length));
      for (const t of inputTasks) {
        const recoveryQty = calcRecoveryQuantity(t.quantity, factor);
        tasks.push({
          axis_type: axis,
          points_to_reclaim: pointsPerTask,
          reclaim_percentage: pct,
          created_date: date,
          expiry_date: getDateOffset(date, 2),
          completed: false,
          task_desc: t.name,
          task_quantity: recoveryQty,
          task_unit: t.unit,
          task_type: 'recovery',
          split_days: 1,
          current_day: 1,
          original_points: pointsPerTask,
        });
      }
    } else {
      // No specific tasks entered
      tasks.push({
        axis_type: axis,
        points_to_reclaim: pointsToReclaim,
        reclaim_percentage: pct,
        created_date: date,
        expiry_date: getDateOffset(date, 2),
        completed: false,
        task_type: 'recovery',
        split_days: 1,
        current_day: 1,
        original_points: pointsToReclaim,
      });
    }
  }

  if (tasks.length > 0) {
    await saveAppendedTasks(tasks);
  }
}

/**
 * Generate istighfar task for the next day
 */
export async function generateIstighfarTask(
  date: string,
  distractionPoints: number,
  istighfarMinutes: number,
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const pointsLost = 10 - distractionPoints;
  const recoverable = Math.round(pointsLost / 2);

  await saveAppendedTasks([{
    axis_type: 'distraction',
    points_to_reclaim: recoverable,
    reclaim_percentage: 50,
    created_date: date,
    expiry_date: getDateOffset(date, 1),
    completed: false,
    task_desc: `استغفار ${istighfarMinutes} دقيقة`,
    task_quantity: istighfarMinutes,
    task_unit: 'minute',
    task_type: 'istighfar',
    istighfar_minutes: istighfarMinutes,
    original_points: recoverable,
  }]);
}

/**
 * Generate split tasks when user chose to split over multiple days
 */
export async function generateSplitTasks(
  axisType: string,
  totalPoints: number,
  splitDays: number,
  date: string,
  tasks: TaskInput[],
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const parentId = crypto.randomUUID();
  const pointsPerDay = Math.round(totalPoints / splitDays);
  const dbTasks: DbAppendedTask[] = [];

  for (let day = 1; day <= splitDays; day++) {
    const taskDate = getDateOffset(date, day - 1);
    const dayTasks = tasks.map(t => ({
      name: t.name,
      quantity: Math.round(t.quantity / splitDays),
      unit: t.unit,
    }));
    
    const desc = dayTasks.map(t => `${t.name} ${t.quantity} ${getUnitLabel(axisType, t.unit)}`).join('، ');
    
    dbTasks.push({
      axis_type: axisType,
      points_to_reclaim: pointsPerDay,
      reclaim_percentage: Math.round((pointsPerDay / totalPoints) * 100),
      created_date: taskDate,
      expiry_date: getDateOffset(taskDate, 1),
      completed: false,
      task_desc: `الجزء ${day}/${splitDays}: ${desc}`,
      task_quantity: null,
      task_unit: null,
      task_type: 'split',
      split_days: splitDays,
      current_day: day,
      original_points: totalPoints,
      parent_task_id: parentId,
    });
  }

  await saveAppendedTasks(dbTasks);
}

// ===== Check consecutive distraction =====

export async function checkConsecutiveDistractionDb(todayDate: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const yesterday = getDateOffset(todayDate, -1);
  const { data, error } = await supabase
    .from("daily_logs").select("distraction_tier")
    .eq("user_id", user.id).eq("date", yesterday).single();
  if (error || !data) return false;
  return data.distraction_tier !== 'none';
}
