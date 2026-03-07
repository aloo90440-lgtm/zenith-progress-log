// Types and localStorage-based state management

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  registeredAt: string;
}

export interface AxisScore {
  percentage: 100 | 75 | 50 | 0;
  points: number;
  deferredPoints: number;
  splitDays?: number; // for 0% option
}

export interface DistractionScore {
  level: 'none' | 'less1h' | '1to3h' | 'more3h';
  points: number;
  istighfarMinutes: number;
}

export interface CompensatoryTask {
  axisName: string;
  deferredPoints: number;
  completed: boolean;
  splitDays?: number;
  splitDayIndex?: number;
}

export interface DailyEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  mentalAxis: AxisScore;
  physicalAxis: AxisScore;
  religiousAxis: AxisScore;
  distraction: DistractionScore;
  note: string;
  compensatoryTasks: CompensatoryTask[];
  totalPoints: number;
  weekNumber: number;
}

export function getPercentagePoints(pct: 100 | 75 | 50 | 0): { points: number; deferred: number } {
  switch (pct) {
    case 100: return { points: 10, deferred: 0 };
    case 75: return { points: 8, deferred: 2 };
    case 50: return { points: 5, deferred: 5 };
    case 0: return { points: 0, deferred: 10 };
  }
}

export function getDistractionScore(level: DistractionScore['level']): DistractionScore {
  switch (level) {
    case 'none': return { level, points: 10, istighfarMinutes: 0 };
    case 'less1h': return { level, points: 7, istighfarMinutes: 20 };
    case '1to3h': return { level, points: 4, istighfarMinutes: 30 };
    case 'more3h': return { level, points: 0, istighfarMinutes: 40 };
  }
}

export function calculateDailyTotal(entry: Omit<DailyEntry, 'totalPoints' | 'id' | 'weekNumber'>): number {
  let total = entry.mentalAxis.points + entry.physicalAxis.points + entry.religiousAxis.points + entry.distraction.points;
  
  // Add compensatory task points
  entry.compensatoryTasks.forEach(task => {
    if (task.completed) {
      total += task.deferredPoints;
    }
  });
  
  return Math.min(total, 40);
}

export function getWeekNumber(dateStr: string, startDate: string): number {
  const date = new Date(dateStr);
  const start = new Date(startDate);
  const diff = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.floor(diff / 7) + 1;
}

export function getWeeklyRating(points: number): { label: string; color: string } {
  if (points >= 180) return { label: 'ممتاز', color: 'text-success' };
  if (points >= 150) return { label: 'جيد جدًا', color: 'text-info' };
  if (points >= 120) return { label: 'جيد', color: 'text-secondary' };
  if (points >= 80) return { label: 'ضعيف', color: 'text-warning' };
  return { label: 'يحتاج إعادة ضبط', color: 'text-destructive' };
}

// Storage helpers
const USERS_KEY = 'perf_users';
const ENTRIES_KEY = 'perf_entries';
const CURRENT_USER_KEY = 'perf_current_user';

export function getUsers(): User[] {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

export function saveUser(user: User) {
  const users = getUsers();
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getCurrentUser(): User | null {
  const id = localStorage.getItem(CURRENT_USER_KEY);
  if (!id) return null;
  return getUsers().find(u => u.id === id) || null;
}

export function setCurrentUser(id: string | null) {
  if (id) localStorage.setItem(CURRENT_USER_KEY, id);
  else localStorage.removeItem(CURRENT_USER_KEY);
}

export function getEntries(userId: string): DailyEntry[] {
  const all: DailyEntry[] = JSON.parse(localStorage.getItem(ENTRIES_KEY) || '[]');
  return all.filter(e => e.userId === userId).sort((a, b) => a.date.localeCompare(b.date));
}

export function saveEntry(entry: DailyEntry) {
  const all: DailyEntry[] = JSON.parse(localStorage.getItem(ENTRIES_KEY) || '[]');
  const idx = all.findIndex(e => e.id === entry.id);
  if (idx >= 0) all[idx] = entry;
  else all.push(entry);
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(all));
}

export function getTodayEntry(userId: string): DailyEntry | undefined {
  const today = new Date().toISOString().split('T')[0];
  return getEntries(userId).find(e => e.date === today);
}

export function getPendingDeferredPoints(userId: string): CompensatoryTask[] {
  const entries = getEntries(userId);
  const today = new Date().toISOString().split('T')[0];
  
  // Get yesterday's entry
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const yesterdayEntry = entries.find(e => e.date === yesterdayStr);
  
  if (!yesterdayEntry) return [];
  
  const tasks: CompensatoryTask[] = [];
  const axes = [
    { name: 'المحور الذهني', axis: yesterdayEntry.mentalAxis },
    { name: 'المحور الجسدي', axis: yesterdayEntry.physicalAxis },
    { name: 'المحور الديني', axis: yesterdayEntry.religiousAxis },
  ];
  
  axes.forEach(({ name, axis }) => {
    if (axis.deferredPoints > 0) {
      if (axis.splitDays && axis.splitDays > 1) {
        const perDay = Math.ceil(axis.deferredPoints / axis.splitDays);
        tasks.push({
          axisName: name,
          deferredPoints: perDay,
          completed: false,
          splitDays: axis.splitDays,
          splitDayIndex: 1,
        });
      } else {
        tasks.push({
          axisName: name,
          deferredPoints: axis.deferredPoints,
          completed: false,
        });
      }
    }
  });
  
  return tasks;
}

export function getWeekEntries(userId: string, weekNum: number): DailyEntry[] {
  return getEntries(userId).filter(e => e.weekNumber === weekNum);
}

export function getCurrentWeekNumber(userId: string): number {
  const user = getCurrentUser();
  if (!user) return 1;
  const today = new Date().toISOString().split('T')[0];
  return getWeekNumber(today, user.registeredAt);
}
