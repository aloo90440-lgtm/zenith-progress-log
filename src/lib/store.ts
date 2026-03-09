// ===== Data Types =====

export type TaskStatus = 'completed' | 'minor_lack' | 'major_lack' | 'not_done';
export type DistractionTier = 'none' | 'less_1h' | '2_3h' | '4h_plus';
export type DistractionType = 'social' | 'movies' | 'music' | 'other';

export const DISTRACTION_TYPE_LABELS: Record<DistractionType, string> = {
  social: 'سوشيال ميديا',
  movies: 'أفلام ومسلسلات',
  music: 'موسيقى',
  other: 'أخرى',
};

// ===== Axis-specific units =====

export const AXIS_UNITS: Record<string, { value: string; label: string }[]> = {
  mental: [
    { value: 'page', label: 'صفحة' },
    { value: 'minute', label: 'دقيقة' },
    { value: 'question', label: 'سؤال' },
    { value: 'word', label: 'كلمة' },
  ],
  physical: [
    { value: 'minute', label: 'دقيقة' },
    { value: 'rep', label: 'عدة' },
    { value: 'set', label: 'مجموعة' },
    { value: 'km', label: 'كم' },
  ],
  religious: [
    { value: 'page', label: 'صفحة' },
    { value: 'ayah', label: 'آية' },
    { value: 'rakah', label: 'ركعة' },
    { value: 'dhikr', label: 'ذكر' },
    { value: 'minute', label: 'دقيقة' },
  ],
};

export function getUnitLabel(axisType: string, unitValue: string): string {
  const units = AXIS_UNITS[axisType] || [];
  return units.find(u => u.value === unitValue)?.label || unitValue;
}

// ===== Interfaces =====

export interface UserProfile {
  name: string;
  phone?: string;
  email?: string;
  primaryGoal: string;
  goalImportance: string;
  axisWeights: { mental: number; physical: number; religious: number };
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

export interface TaskInput {
  name: string;
  quantity: number;
  unit: string; // unit value from AXIS_UNITS
}

export interface AppendedTask {
  id: string;
  axisType: 'mental' | 'physical' | 'religious';
  pointsToReclaim: number;
  reclaimPercentage: number;
  createdDate: string;
  expiryDate: string;
  completed: boolean;
}

export interface DailyLog {
  date: string;
  distraction: DistractionEntry;
  axes: { mental: AxisEntry; physical: AxisEntry; religious: AxisEntry };
  appendedTasksCompleted: string[];
  appendedTasksFailed: string[];
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

// ===== 9 PM Day Boundary =====

/** 
 * Get the "effective date" for the app.
 * New day starts at 9 PM (21:00).
 * 9 PM - midnight → today's date (evaluating today)
 * midnight - 6 AM → yesterday's date (still same evaluation window)
 * 6 AM - 9 PM → today's date (but evaluation window is closed)
 */
export function getEffectiveDate(): string {
  const now = new Date();
  const hour = now.getHours();
  if (hour < 6) {
    // Between midnight and 6 AM - still yesterday's evaluation window
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  return now.toISOString().slice(0, 10);
}

/** Check if the evaluation window is currently open (9 PM - 6 AM) */
export function isEvaluationWindowOpen(): boolean {
  const hour = new Date().getHours();
  return hour >= 21 || hour < 6;
}

/** Legacy - now uses getEffectiveDate */
export function getTodayStr(): string {
  return getEffectiveDate();
}

// ===== Scoring Logic =====

export function getAxisMaxScore(weights: { mental: number; physical: number; religious: number }, axis: 'mental' | 'physical' | 'religious'): number {
  const totalWeight = weights.mental + weights.physical + weights.religious;
  if (totalWeight === 0) return 10;
  return Math.round((weights[axis] / totalWeight) * 30);
}

export function getAllAxisMaxScores(weights: { mental: number; physical: number; religious: number }): { mental: number; physical: number; religious: number } {
  const totalWeight = weights.mental + weights.physical + weights.religious;
  if (totalWeight === 0) return { mental: 10, physical: 10, religious: 10 };
  
  const raw = {
    mental: (weights.mental / totalWeight) * 30,
    physical: (weights.physical / totalWeight) * 30,
    religious: (weights.religious / totalWeight) * 30,
  };
  
  const rounded = {
    mental: Math.round(raw.mental),
    physical: Math.round(raw.physical),
    religious: Math.round(raw.religious),
  };
  
  const diff = 30 - (rounded.mental + rounded.physical + rounded.religious);
  if (diff !== 0) {
    const largest = Object.entries(rounded).sort((a, b) => b[1] - a[1])[0][0] as keyof typeof rounded;
    rounded[largest] += diff;
  }
  
  return rounded;
}

export function getAxisScore(status: TaskStatus, maxScore: number = 10): { baseScore: number; deduction: number; finalScore: number } {
  const multiplier = status === 'completed' ? 1 : status === 'minor_lack' ? 0.7 : status === 'major_lack' ? 0.3 : 0;
  const finalScore = Math.round(maxScore * multiplier);
  return { baseScore: maxScore, deduction: maxScore - finalScore, finalScore };
}

export function getDistractionScore(tier: DistractionTier): DistractionEntry {
  switch (tier) {
    case 'none': return { tier, points: 10, istighfarMinutes: 0 };
    case 'less_1h': return { tier, points: 8, istighfarMinutes: 15 };
    case '2_3h': return { tier, points: 6, istighfarMinutes: 30 };
    case '4h_plus': return { tier, points: 0, istighfarMinutes: 40 };
  }
}

/** Recovery percentages: minor = 20%, major = 40% */
export function getRecoveryFactor(status: 'minor_lack' | 'major_lack'): number {
  return status === 'minor_lack' ? 0.20 : 0.40;
}

/** Calculate recovery quantity: original * factor, rounded smartly (no decimals) */
export function calcRecoveryQuantity(originalQty: number, factor: number): number {
  const raw = originalQty * factor;
  return Math.round(raw); // 2.3→2, 2.6→3
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
  if (consecutiveDistraction) return 0;
  const axisTotal = axes.mental.finalScore + axes.physical.finalScore + axes.religious.finalScore;
  return Math.min(40, axisTotal + distraction.points + appendedRecovered);
}

// ===== Daily Ratings =====

export function getDailyRating(score: number): { label: string; color: string; emoji: string } {
  if (score >= 36) return { label: 'امتياز', color: 'text-primary', emoji: '🏆' };
  if (score >= 28) return { label: 'جيد جدًا', color: 'text-accent', emoji: '⭐' };
  if (score >= 20) return { label: 'جيد', color: 'text-dust', emoji: '👍' };
  return { label: 'مقبول', color: 'text-destructive', emoji: '📉' };
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
      const isMinor = entry.finalScore >= entry.baseScore * 0.6;
      const pct = isMinor ? 0.20 : 0.40;
      tasks.push({
        id: `${date}-${axis}-${Date.now()}`,
        axisType: axis,
        pointsToReclaim: Math.round(entry.deduction * pct),
        reclaimPercentage: isMinor ? 20 : 40,
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
  ).slice(0, 3);
}

export function saveDailyLog(log: DailyLog) {
  const data = loadJourney();
  const idx = data.logs.findIndex(l => l.date === log.date);
  if (idx >= 0) data.logs[idx] = log;
  else data.logs.push(log);
  const newTasks = generateAppendedTasks(log.axes, log.date);
  data.appendedTasks.push(...newTasks);
  for (const id of log.appendedTasksCompleted) {
    const t = data.appendedTasks.find(t => t.id === id);
    if (t) t.completed = true;
  }
  data.appendedTasks = data.appendedTasks.filter(t => t.completed || t.expiryDate >= log.date);
  saveJourney(data);
}

// ===== Date Helpers =====

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

export function getLongestStreak(logs: DailyLog[]): number {
  if (!logs.length) return 0;
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  let longest = 0;
  let current = 0;
  let lastDate = '';
  for (const log of sorted) {
    if (log.totalScore <= 0) { current = 0; continue; }
    if (lastDate && getDateOffset(lastDate, 1) === log.date) {
      current++;
    } else {
      current = 1;
    }
    lastDate = log.date;
    longest = Math.max(longest, current);
  }
  return longest;
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

export function getAxisStrength(logs: DailyLog[]): string | null {
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
  const max = Math.max(totals.mental, totals.physical, totals.religious);
  const strongAxis = Object.entries(totals).find(([, v]) => v === max);
  return strongAxis ? labels[strongAxis[0]] : null;
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
  minor_lack: 'نقص بسيط (أنجزت أكثر من نصف المهمة)',
  major_lack: 'نقص كبير (أنجزت أقل من نصف المهمة)',
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

// ===== Challenge Map (20 days) =====

export function getChallengeMapData(logs: DailyLog[]): Array<{ date: string; score: number; day: number }> {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.slice(0, 20).map((l, i) => ({
    date: l.date,
    score: l.totalScore,
    day: i + 1,
  }));
}

export function getChallengeBadge(score: number): { label: string; emoji: string; color: string } {
  if (score >= 35) return { label: 'محارب', emoji: '⚔️', color: 'bg-primary/20 text-primary border-primary/30' };
  if (score >= 20) return { label: 'محارب بدون ثياب', emoji: '🛡️', color: 'bg-accent/20 text-accent border-accent/30' };
  return { label: 'سلحفاة', emoji: '🐢', color: 'bg-destructive/20 text-destructive border-destructive/30' };
}

// ===== Goal Progress (20-day target) =====

export function getGoalProgress(logs: DailyLog[]): { current: number; target: number; percentage: number; message: string } {
  const target = 20;
  const current = logs.length;
  const percentage = Math.min(100, Math.round((current / target) * 100));
  
  const avgScore = logs.length > 0 ? logs.reduce((s, l) => s + (l.total_score ?? l.totalScore ?? 0), 0) / logs.length : 0;
  let message = '';
  if (avgScore >= 36) message = 'تقدم ممتاز! 🔥';
  else if (avgScore >= 28) message = 'تقدم مستمر! ⭐';
  else message = 'تقدم أبطأ، اجتهد أكثر! 💪';
  
  return { current, target, percentage, message };
}
