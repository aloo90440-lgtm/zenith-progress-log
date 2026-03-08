// ===== Data Types =====

export type TaskStatus = 'completed' | 'minor_lack' | 'major_lack' | 'not_done';
export type DistractionTier = 'none' | 'less_1h' | '2_3h' | '4h_plus';

export interface UserProfile {
  name: string;
  phone?: string;
  email?: string;
  primaryGoal: string;
  goalImportance: string; // min 5 lines
  axisWeights: {
    mental: number; // 10-100%
    physical: number;
    religious: number;
  };
  createdAt: string;
}

export interface AxisEntry {
  status: TaskStatus;
  baseScore: number;
  deduction: number;
  finalScore: number;
}

export interface DistractionEntry {
  tier: DistractionTier;
  points: number;
  istighfarMinutes: number;
}

export interface AppendedTask {
  id: string;
  axisType: 'mental' | 'physical' | 'religious';
  pointsToReclaim: number;
  reclaimPercentage: number; // 15% for minor, 35% for major
  createdDate: string;
  expiryDate: string;
  completed: boolean;
}

export interface DailyLog {
  date: string;
  distraction: DistractionEntry;
  axes: {
    mental: AxisEntry;
    physical: AxisEntry;
    religious: AxisEntry;
  };
  appendedTasksCompleted: string[]; // IDs
  appendedTasksFailed: string[]; // IDs
  dailyNote: string;
  totalScore: number;
  consecutiveDistraction: boolean;
  createdAt: string;
}

export interface JourneyData {
  user: UserProfile | null;
  logs: DailyLog[];
  appendedTasks: AppendedTask[];
}

const STORAGE_KEY = 'the-journey-v2';

// ===== Persistence =====

export function loadJourney(): JourneyData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { user: null, logs: [], appendedTasks: [] };
}

export function saveJourney(data: JourneyData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function saveUser(user: UserProfile) {
  const data = loadJourney();
  data.user = user;
  saveJourney(data);
}

// ===== Scoring Logic =====

export function getAxisScore(status: TaskStatus): { baseScore: number; deduction: number; finalScore: number } {
  switch (status) {
    case 'completed': return { baseScore: 10, deduction: 0, finalScore: 10 };
    case 'minor_lack': return { baseScore: 10, deduction: 3, finalScore: 7 };
    case 'major_lack': return { baseScore: 10, deduction: 7, finalScore: 3 };
    case 'not_done': return { baseScore: 10, deduction: 10, finalScore: 0 };
  }
}

export function getDistractionScore(tier: DistractionTier): DistractionEntry {
  switch (tier) {
    case 'none': return { tier, points: 10, istighfarMinutes: 0 };
    case 'less_1h': return { tier, points: 8, istighfarMinutes: 15 };
    case '2_3h': return { tier, points: 6, istighfarMinutes: 30 };
    case '4h_plus': return { tier, points: 0, istighfarMinutes: 40 };
  }
}

export function checkConsecutiveDistraction(logs: DailyLog[], todayDate: string): boolean {
  const yesterday = getDateOffset(todayDate, -1);
  const yesterdayLog = logs.find(l => l.date === yesterday);
  return !!yesterdayLog && yesterdayLog.distraction.tier !== 'none';
}

export function calculateDailyTotal(
  axes: { mental: AxisEntry; physical: AxisEntry; religious: AxisEntry },
  distraction: DistractionEntry,
  consecutiveDistraction: boolean,
  appendedRecovered: number
): number {
  if (consecutiveDistraction) return 0; // consecutive distraction = 0 total

  const axisTotal = axes.mental.finalScore + axes.physical.finalScore + axes.religious.finalScore;
  return Math.min(40, axisTotal + distraction.points + appendedRecovered);
}

// ===== Appended/Recovery Tasks =====

export function generateAppendedTasks(
  axes: { mental: AxisEntry; physical: AxisEntry; religious: AxisEntry },
  date: string
): AppendedTask[] {
  const tasks: AppendedTask[] = [];
  const axisTypes: Array<'mental' | 'physical' | 'religious'> = ['mental', 'physical', 'religious'];

  for (const axis of axisTypes) {
    const entry = axes[axis];
    if (entry.deduction > 0) {
      const isMinor = entry.finalScore === 7;
      tasks.push({
        id: `${date}-${axis}-${Date.now()}`,
        axisType: axis,
        pointsToReclaim: isMinor ? Math.round(entry.deduction * 0.15) : Math.round(entry.deduction * 0.35),
        reclaimPercentage: isMinor ? 15 : 35,
        createdDate: date,
        expiryDate: getDateOffset(date, 2),
        completed: false,
      });
    }
  }

  return tasks;
}

export function getPendingAppendedTasks(data: JourneyData, date: string): AppendedTask[] {
  return data.appendedTasks.filter(t =>
    !t.completed &&
    t.expiryDate >= date &&
    t.createdDate < date &&
    !data.logs.some(l => l.date >= t.createdDate && l.date < date && l.appendedTasksFailed.includes(t.id))
  ).slice(0, 3); // max 3 per day
}

// ===== Save Daily Log =====

export function saveDailyLog(log: DailyLog) {
  const data = loadJourney();
  const idx = data.logs.findIndex(l => l.date === log.date);
  if (idx >= 0) data.logs[idx] = log;
  else data.logs.push(log);

  // Generate new appended tasks from today's deductions
  const newTasks = generateAppendedTasks(log.axes, log.date);
  data.appendedTasks.push(...newTasks);

  // Mark completed/failed appended tasks
  for (const id of log.appendedTasksCompleted) {
    const t = data.appendedTasks.find(t => t.id === id);
    if (t) t.completed = true;
  }

  // Remove expired tasks
  data.appendedTasks = data.appendedTasks.filter(t =>
    t.completed || t.expiryDate >= log.date
  );

  saveJourney(data);
}

// ===== Date Helpers =====

export function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getDateOffset(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ===== Analytics =====

export function getStreak(logs: DailyLog[]): number {
  if (!logs.length) return 0;
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  let checkDate = new Date(getTodayStr());

  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    const found = sorted.find(l => l.date === dateStr && l.totalScore > 0);
    if (found) streak++;
    else if (i > 0) break;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
}

export function getWeeklyLogs(logs: DailyLog[]): DailyLog[] {
  const today = getTodayStr();
  const weekAgo = getDateOffset(today, -6);
  return logs.filter(l => l.date >= weekAgo && l.date <= today).sort((a, b) => a.date.localeCompare(b.date));
}

export function getWeeklyScore(logs: DailyLog[]): number {
  return getWeeklyLogs(logs).reduce((s, l) => s + l.totalScore, 0);
}

export function getWeeklyRating(score: number): { label: string; color: string } {
  if (score >= 180) return { label: 'ممتاز', color: 'text-accent' };
  if (score >= 150) return { label: 'جيد جدًا', color: 'text-primary' };
  if (score >= 120) return { label: 'جيد', color: 'text-dust' };
  if (score >= 80) return { label: 'ضعيف', color: 'text-destructive' };
  return { label: 'يحتاج إعادة ضبط', color: 'text-destructive' };
}

export function getAverageDaily(logs: DailyLog[]): number {
  if (!logs.length) return 0;
  return Math.round(logs.reduce((s, l) => s + l.totalScore, 0) / logs.length);
}

export function getBestDay(logs: DailyLog[]): DailyLog | null {
  if (!logs.length) return null;
  return logs.reduce((best, l) => l.totalScore > best.totalScore ? l : best, logs[0]);
}

export function getActiveDays(logs: DailyLog[]): number {
  return logs.filter(l => l.totalScore > 0).length;
}

export function getAxisWeakness(logs: DailyLog[]): string | null {
  if (!logs.length) return null;
  const weekly = getWeeklyLogs(logs);
  if (!weekly.length) return null;

  const totals = { mental: 0, physical: 0, religious: 0 };
  for (const l of weekly) {
    totals.mental += l.axes.mental.finalScore;
    totals.physical += l.axes.physical.finalScore;
    totals.religious += l.axes.religious.finalScore;
  }

  const labels: Record<string, string> = { mental: 'الذهني', physical: 'الجسدي', religious: 'الديني' };
  const min = Math.min(totals.mental, totals.physical, totals.religious);
  const weakAxis = Object.entries(totals).find(([, v]) => v === min);
  return weakAxis ? labels[weakAxis[0]] : null;
}

export function getDistractionStats(logs: DailyLog[]): { clean: number; total: number } {
  const weekly = getWeeklyLogs(logs);
  return {
    clean: weekly.filter(l => l.distraction.tier === 'none').length,
    total: weekly.length,
  };
}

export function getWeeklyNotes(logs: DailyLog[]): Array<{ date: string; note: string }> {
  return getWeeklyLogs(logs)
    .filter(l => l.dailyNote.trim())
    .map(l => ({ date: l.date, note: l.dailyNote }));
}

// ===== Axis Labels =====

export const AXIS_LABELS: Record<string, string> = {
  mental: 'المحور الذهني',
  physical: 'المحور الجسدي',
  religious: 'المحور الديني',
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  completed: 'أتممت المهام بالكامل',
  minor_lack: 'نقص بسيط (70%)',
  major_lack: 'نقص كبير (30%)',
  not_done: 'لم أنجز شيئًا',
};

export const DISTRACTION_LABELS: Record<DistractionTier, string> = {
  none: 'لا مشتتات',
  less_1h: 'أقل من ساعة',
  '2_3h': '٢ - ٣ ساعات',
  '4h_plus': 'أكثر من ٤ ساعات',
};

// ===== Motivational =====

const messages = [
  "تقدمت خطوة في رحلتك اليوم.",
  "خطوة أخرى نحو هدفك.",
  "الطريق يتضح مع كل خطوة.",
  "الانضباط هو الجسر بين الأهداف والإنجاز.",
  "يوم آخر من التقدم. استمر.",
  "الصحراء تُكافئ من يصبر.",
  "رحلتك مستمرة. ابقَ ثابتًا.",
  "كل خطوة مهمة، مهما كانت صغيرة.",
];

export function getMotivationalMessage(): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

export function getSmartReminder(user: UserProfile): string {
  return `تذكّر هدفك: "${user.primaryGoal}" — لأنه مهم لك: "${user.goalImportance.split('\n')[0]}..."`;
}

// ===== Heatmap Data =====

export function getHeatmapData(logs: DailyLog[], days: number = 30): Array<{ date: string; score: number }> {
  const result: Array<{ date: string; score: number }> = [];
  const today = getTodayStr();
  for (let i = days - 1; i >= 0; i--) {
    const d = getDateOffset(today, -i);
    const log = logs.find(l => l.date === d);
    result.push({ date: d, score: log?.totalScore || 0 });
  }
  return result;
}
