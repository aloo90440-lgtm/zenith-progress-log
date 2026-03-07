export interface JourneyGoal {
  title: string;
  description: string;
  duration?: number;
  createdAt: string;
}

export interface DailyEntry {
  date: string;
  progress: number;
  createdAt: string;
}

export interface JourneyData {
  goal: JourneyGoal | null;
  entries: DailyEntry[];
}

const STORAGE_KEY = 'the-journey-data';

export function loadJourney(): JourneyData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { goal: null, entries: [] };
}

export function saveJourney(data: JourneyData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function saveGoal(goal: JourneyGoal) {
  const data = loadJourney();
  data.goal = goal;
  saveJourney(data);
}

export function saveDailyEntry(entry: DailyEntry) {
  const data = loadJourney();
  const idx = data.entries.findIndex(e => e.date === entry.date);
  if (idx >= 0) data.entries[idx] = entry;
  else data.entries.push(entry);
  saveJourney(data);
}

export function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getStreak(entries: DailyEntry[]): number {
  if (!entries.length) return 0;
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  let checkDate = new Date(getTodayStr());

  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    const found = sorted.find(e => e.date === dateStr && e.progress > 0);
    if (found) {
      streak++;
    } else if (i > 0) {
      break;
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
}

export function getAverageProgress(entries: DailyEntry[]): number {
  if (!entries.length) return 0;
  return Math.round(entries.reduce((acc, e) => acc + e.progress, 0) / entries.length);
}

export function getBestDay(entries: DailyEntry[]): DailyEntry | null {
  if (!entries.length) return null;
  return entries.reduce((best, e) => e.progress > best.progress ? e : best, entries[0]);
}

export function getTotalProgress(entries: DailyEntry[]): number {
  if (!entries.length) return 0;
  return Math.min(100, Math.round(entries.reduce((acc, e) => acc + e.progress, 0) / entries.length));
}

export function getActiveDays(entries: DailyEntry[]): number {
  return entries.filter(e => e.progress > 0).length;
}

const messages = [
  "You moved forward in your journey today.",
  "Another step taken.",
  "The path becomes clearer with every step.",
  "Discipline is the bridge between goals and achievement.",
  "One more day of progress. Keep walking.",
  "The desert rewards those who persist.",
  "Your journey continues. Stay the course.",
  "Every step matters, no matter how small.",
];

export function getMotivationalMessage(): string {
  return messages[Math.floor(Math.random() * messages.length)];
}
