import type { FocusSession, LeetCodeProblem } from '../../../types';
import type { WorkoutEntry, SleepEntry } from '../../../types/health';
import { normalizeToLocalDateString } from '../../../utils/dateNormalization';

export interface ReportChapter {
  id?: string | number;
  number?: number;
  title?: string;
  completed?: boolean;
  dateCompleted?: string;
}

export function safeNumber(value: number | undefined | null): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

export function problemKey(problem: LeetCodeProblem): string {
  const slug = problem.link?.trim().toLowerCase() || '';
  if (slug.includes('/problems/')) {
    return slug.split('/problems/')[1]?.split('/')[0] || problem.name.trim().toLowerCase();
  }
  return problem.name.trim().toLowerCase();
}

export function sessionKey(session: FocusSession): string {
  const dateKey = normalizeToLocalDateString(session.date || session.startTime) || session.date || session.startTime;
  return `${dateKey}_${session.startTime}_${session.actualDuration || session.duration}_${session.mode}`;
}

export function workoutKey(workout: WorkoutEntry): string {
  return `${workout.date}_${workout.startTime || '08:30'}_${workout.name.trim().toLowerCase()}_${workout.durationMinutes}`;
}

export function chapterKey(chapter: ReportChapter): string {
  return `${chapter.id ?? `${chapter.number ?? 'x'}_${chapter.title ?? 'chapter'}`}_${chapter.dateCompleted ?? 'n/a'}`;
}

export function dedupeProblems(problems: LeetCodeProblem[]): LeetCodeProblem[] {
  const bestByKey = new Map<string, LeetCodeProblem>();

  for (const problem of problems) {
    const key = problemKey(problem);
    const existing = bestByKey.get(key);
    if (!existing) {
      bestByKey.set(key, problem);
      continue;
    }

    const existingDate = normalizeToLocalDateString(existing.date) || existing.date;
    const currentDate = normalizeToLocalDateString(problem.date) || problem.date;

    const shouldReplace =
      (problem.completed && !existing.completed) ||
      (problem.completed === existing.completed && currentDate > existingDate);

    if (shouldReplace) {
      bestByKey.set(key, problem);
    }
  }

  return Array.from(bestByKey.values());
}

export function dedupeFocusSessions(sessions: FocusSession[]): FocusSession[] {
  const bestByKey = new Map<string, FocusSession>();

  for (const session of sessions) {
    const key = sessionKey(session);
    const existing = bestByKey.get(key);
    if (!existing) {
      bestByKey.set(key, session);
      continue;
    }

    const existingMinutes = safeNumber(existing.actualDuration) || existing.duration;
    const currentMinutes = safeNumber(session.actualDuration) || session.duration;
    const shouldReplace =
      (session.completed && !existing.completed) ||
      (session.completed === existing.completed && currentMinutes > existingMinutes);

    if (shouldReplace) {
      bestByKey.set(key, session);
    }
  }

  return Array.from(bestByKey.values());
}

export function dedupeWorkouts(workouts: WorkoutEntry[]): WorkoutEntry[] {
  const bestByKey = new Map<string, WorkoutEntry>();

  for (const workout of workouts) {
    const key = workoutKey(workout);
    const existing = bestByKey.get(key);
    if (!existing) {
      bestByKey.set(key, workout);
      continue;
    }

    const existingCalories = safeNumber(existing.caloriesBurned);
    const currentCalories = safeNumber(workout.caloriesBurned);
    if (currentCalories > existingCalories) {
      bestByKey.set(key, workout);
    }
  }

  return Array.from(bestByKey.values());
}

export function dedupeSleepEntries(entries: SleepEntry[]): SleepEntry[] {
  const bestByDate = new Map<string, SleepEntry>();

  for (const entry of entries) {
    const date = normalizeToLocalDateString(entry.date);
    if (!date) continue;
    const existing = bestByDate.get(date);
    if (!existing || entry.totalMinutes > existing.totalMinutes) {
      bestByDate.set(date, entry);
    }
  }

  return Array.from(bestByDate.values());
}

export function dedupeChapters(chapters: ReportChapter[]): ReportChapter[] {
  const seen = new Set<string>();
  return chapters.filter((chapter) => {
    if (!chapter.completed || !chapter.dateCompleted) return false;
    const key = chapterKey(chapter);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
