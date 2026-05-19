import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, differenceInDays, parseISO, isToday, isYesterday } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  if (typeof date === 'string') {
    if (date.length === 10 && date.includes('-')) {
      const [year, month, day] = date.split('-').map(Number);
      return format(new Date(year, month - 1, day), 'MMM d, yyyy');
    }
    return format(parseISO(date), 'MMM d, yyyy');
  }
  return format(date, 'MMM d, yyyy');
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function calculateStreak(history: Record<string, boolean>): { current: number; longest: number } {
  const today = new Date();
  let current = 0;
  let longest = 0;
  let tempLongest = 0;

  const todayKey = format(today, 'yyyy-MM-dd');
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = format(yesterday, 'yyyy-MM-dd');

  // If today is not completed yet, but yesterday is, count backwards starting from yesterday
  const startOffset = history[todayKey] ? 0 : (history[yesterdayKey] ? 1 : 0);

  // Current streak - count backwards
  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = format(d, 'yyyy-MM-dd');
    if (history[key]) {
      current++;
    } else {
      break;
    }
  }

  // Longest streak
  const sorted = Object.keys(history).filter(k => history[k]).sort();
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      tempLongest = 1;
    } else {
      const prev = parseISO(sorted[i - 1]);
      const curr = parseISO(sorted[i]);
      if (differenceInDays(curr, prev) === 1) {
        tempLongest++;
      } else {
        tempLongest = 1;
      }
    }
    longest = Math.max(longest, tempLongest);
  }

  return { current, longest };
}

export function updateStreakData(streak: { currentStreak: number; longestStreak: number; history: Record<string, boolean> }): { currentStreak: number; longestStreak: number; lastActivityDate: string; history: Record<string, boolean> } {
  const history = { ...streak.history, [todayString()]: true };
  const { current, longest } = calculateStreak(history);
  return { 
    currentStreak: current, 
    longestStreak: Math.max(longest, streak.longestStreak), 
    lastActivityDate: todayString(), 
    history 
  };
}

export function getProductivityScore(
  chaptersToday: number,
  problemsToday: number,
  focusMinutesToday: number
): number {
  const readingScore = Math.min(chaptersToday * 20, 40);
  const codingScore = Math.min(problemsToday * 30, 40);
  const focusScore = Math.min(focusMinutesToday / 120 * 20, 20);
  return Math.round(readingScore + codingScore + focusScore);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 v4 compliant UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getDateLabel(dateStr: string): string {
  let d;
  if (dateStr.length === 10 && dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('-').map(Number);
    d = new Date(year, month - 1, day);
  } else {
    d = parseISO(dateStr);
  }
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

export function exportToJSON(data: object, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importFromJSON(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(data);
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function interpolateColor(color1: string, color2: string, factor: number): string {
  return `color-mix(in srgb, ${color1} ${Math.round(factor * 100)}%, ${color2})`;
}

export function getHeatmapColor(value: number, max: number = 4): string {
  const intensity = Math.min(value / max, 1);
  if (intensity === 0) return 'rgba(139, 92, 246, 0.05)';
  if (intensity < 0.25) return 'rgba(139, 92, 246, 0.25)';
  if (intensity < 0.5) return 'rgba(139, 92, 246, 0.5)';
  if (intensity < 0.75) return 'rgba(139, 92, 246, 0.75)';
  return 'rgba(139, 92, 246, 1)';
}
