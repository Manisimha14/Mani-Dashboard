import type { FocusSession, LeetCodeProblem, Tracker } from '../../../types';
import type { WaterEntry, SleepEntry, WorkoutEntry, MealEntry } from '../../../types/health';
import { normalizeToLocalDateString } from '../../../utils/dateNormalization';
import { safeNumber, type ReportChapter } from './dedupe';

export interface AggregateTotals {
  focusMinutes: number;
  completedSessions: number;
  totalSessions: number;
  problemsSolved: number;
  chaptersRead: number;
  waterMl: number;
  sleepMinutes: number;
  sleepDaysWithData: number;
  workoutsCount: number;
  steps: number;
  caloriesIn: number;
  caloriesOut: number;
  waterDaysHit: number;
  sleepDaysHit: number;
  problemsDaysHit: number;
  readingDaysHit: number;
}

export interface DailyReportPoint {
  date: string;
  shortLabel: string;
  fullLabel: string;
  focusMinutes: number;
  focusSessionsCompleted: number;
  focusSessionsTotal: number;
  codingSolved: number;
  codingNames: string[];
  hydrationMl: number;
  sleepMinutes: number;
  steps: number;
  caloriesIn: number;
  caloriesOut: number;
  readingChapters: number;
  workoutCount: number;
  workoutMinutes: number;
  workoutNames: string[];
}

export function buildDailyBreakdown(params: {
  dates: string[];
  focusSessions: FocusSession[];
  problems: LeetCodeProblem[];
  waterEntries: WaterEntry[];
  sleepEntries: SleepEntry[];
  workouts: WorkoutEntry[];
  chapters: ReportChapter[];
  stepsData: Record<string, number>;
  meals: MealEntry[];
}): DailyReportPoint[] {
  const {
    dates,
    focusSessions,
    problems,
    waterEntries,
    sleepEntries,
    workouts,
    chapters,
    stepsData,
    meals,
  } = params;

  const dateSet = new Set(dates); // High performance Set lookup instead of O(N) includes

  const focusMap = new Map<string, FocusSession[]>();
  for (const session of focusSessions) {
    const date = normalizeToLocalDateString(session.date || session.startTime);
    if (!date || !dateSet.has(date)) continue;
    const list = focusMap.get(date) || [];
    list.push(session);
    focusMap.set(date, list);
  }

  const problemMap = new Map<string, LeetCodeProblem[]>();
  for (const problem of problems) {
    const date = normalizeToLocalDateString(problem.date);
    if (!date || !dateSet.has(date)) continue;
    const list = problemMap.get(date) || [];
    list.push(problem);
    problemMap.set(date, list);
  }

  const waterMap = new Map<string, WaterEntry[]>();
  for (const water of waterEntries) {
    const date = normalizeToLocalDateString(water.date);
    if (!date || !dateSet.has(date)) continue;
    const list = waterMap.get(date) || [];
    list.push(water);
    waterMap.set(date, list);
  }

  const sleepMap = new Map<string, SleepEntry>();
  for (const sleep of sleepEntries) {
    const date = normalizeToLocalDateString(sleep.date);
    if (!date || !dateSet.has(date)) continue;
    const existing = sleepMap.get(date);
    if (!existing || sleep.totalMinutes > existing.totalMinutes) {
      sleepMap.set(date, sleep);
    }
  }

  const workoutMap = new Map<string, WorkoutEntry[]>();
  for (const workout of workouts) {
    const date = normalizeToLocalDateString(workout.date);
    if (!date || !dateSet.has(date)) continue;
    const list = workoutMap.get(date) || [];
    list.push(workout);
    workoutMap.set(date, list);
  }

  const chapterMap = new Map<string, ReportChapter[]>();
  for (const chapter of chapters) {
    const date = normalizeToLocalDateString(chapter.dateCompleted || '');
    if (!date || !dateSet.has(date)) continue;
    const list = chapterMap.get(date) || [];
    list.push(chapter);
    chapterMap.set(date, list);
  }

  const mealMap = new Map<string, MealEntry[]>();
  for (const meal of meals) {
    const date = normalizeToLocalDateString(meal.date);
    if (!date || !dateSet.has(date)) continue;
    const list = mealMap.get(date) || [];
    list.push(meal);
    mealMap.set(date, list);
  }

  const toLocalDayLabel = (date: string, token: string): string => {
    // Avoid timezone shift using Z-string standard
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('en-US', token === 'EEE' ? { weekday: 'short' } : { weekday: 'long', month: 'short', day: 'numeric' });
  };

  return dates.map((date) => {
    const sessionsList = focusMap.get(date) || [];
    const daySessionsCompleted = sessionsList.filter((session) => session.completed);
    const focusMinutes = daySessionsCompleted.reduce((total, session) => total + (safeNumber(session.actualDuration) || session.duration), 0);
    const dayProblems = (problemMap.get(date) || []).filter((problem) => problem.completed);
    const dayWater = waterMap.get(date) || [];
    const hydrationMl = dayWater.reduce((total, water) => total + water.amount, 0);
    const sleep = sleepMap.get(date);
    const dayWorkouts = workoutMap.get(date) || [];
    const dayMeals = mealMap.get(date) || [];

    return {
      date,
      shortLabel: toLocalDayLabel(date, 'EEE'),
      fullLabel: toLocalDayLabel(date, 'EEEE, MMM d'),
      focusMinutes,
      // P0: Fix the session aggregation rate bug by segregating completed and total sessions cleanly
      focusSessionsCompleted: daySessionsCompleted.length,
      focusSessionsTotal: sessionsList.length,
      codingSolved: dayProblems.length,
      codingNames: dayProblems.map((problem) => problem.name),
      hydrationMl,
      sleepMinutes: sleep?.totalMinutes || 0,
      steps: stepsData[date] || 0,
      caloriesIn: dayMeals.reduce((total, meal) => total + meal.calories, 0),
      caloriesOut: dayWorkouts.reduce((total, workout) => total + safeNumber(workout.caloriesBurned), 0),
      readingChapters: (chapterMap.get(date) || []).length,
      workoutCount: dayWorkouts.length,
      workoutMinutes: dayWorkouts.reduce((total, workout) => total + workout.durationMinutes, 0),
      workoutNames: dayWorkouts.map((workout) => workout.name),
    };
  });
}

export function aggregateDaily(points: DailyReportPoint[], targets: { waterGoalMl: number; sleepGoalMin: number }): AggregateTotals {
  return points.reduce<AggregateTotals>((totals, point) => {
    totals.focusMinutes += point.focusMinutes;
    totals.completedSessions += point.focusSessionsCompleted;
    totals.totalSessions += point.focusSessionsTotal; // Aggregates actual overall sessions correctly
    totals.problemsSolved += point.codingSolved;
    totals.chaptersRead += point.readingChapters;
    totals.waterMl += point.hydrationMl;
    totals.sleepMinutes += point.sleepMinutes;
    totals.sleepDaysWithData += point.sleepMinutes > 0 ? 1 : 0;
    totals.workoutsCount += point.workoutCount;
    totals.steps += point.steps;
    totals.caloriesIn += point.caloriesIn;
    totals.caloriesOut += point.caloriesOut;
    totals.waterDaysHit += point.hydrationMl >= targets.waterGoalMl ? 1 : 0;
    totals.sleepDaysHit += point.sleepMinutes >= targets.sleepGoalMin ? 1 : 0;
    totals.problemsDaysHit += point.codingSolved > 0 ? 1 : 0;
    totals.readingDaysHit += point.readingChapters > 0 ? 1 : 0;
    return totals;
  }, {
    focusMinutes: 0,
    completedSessions: 0,
    totalSessions: 0,
    problemsSolved: 0,
    chaptersRead: 0,
    waterMl: 0,
    sleepMinutes: 0,
    sleepDaysWithData: 0,
    workoutsCount: 0,
    steps: 0,
    caloriesIn: 0,
    caloriesOut: 0,
    waterDaysHit: 0,
    sleepDaysHit: 0,
    problemsDaysHit: 0,
    readingDaysHit: 0,
  });
}
