import { format } from 'date-fns';
import { normalizeToLocalDateString } from '../../utils/dateNormalization';
import { calculateFocusQualityScore } from '../../utils/scoring';
import type { FocusSession, LeetCodeProblem, Tracker } from '../../types';
import type { WaterEntry, SleepEntry, WorkoutEntry, HealthGoal, MealEntry } from '../../types/health';
import type {
  CustomTrackerWeeklySummary,
  DailyReportPoint,
  ReportMetricCard,
  ValidatedInsight,
  WeeklyComparisonRow,
  WeeklyReportStats,
} from '../../types/report';

interface ReportChapter {
  id?: string | number;
  number?: number;
  title?: string;
  completed?: boolean;
  dateCompleted?: string;
}

interface AggregateTotals {
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

const CODING_WEEKLY_TARGET = 7;
const READING_WEEKLY_TARGET = 3;
const FOCUS_WEEKLY_TARGET_MIN = 300;

function safeNumber(value: number | undefined | null): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

function problemKey(problem: LeetCodeProblem): string {
  const slug = problem.link?.trim().toLowerCase() || '';
  if (slug.includes('/problems/')) {
    return slug.split('/problems/')[1]?.split('/')[0] || problem.name.trim().toLowerCase();
  }
  return problem.name.trim().toLowerCase();
}

function sessionKey(session: FocusSession): string {
  const dateKey = normalizeToLocalDateString(session.date || session.startTime) || session.date || session.startTime;
  return `${dateKey}_${session.startTime}_${session.actualDuration || session.duration}_${session.mode}`;
}

function workoutKey(workout: WorkoutEntry): string {
  return `${workout.date}_${workout.startTime || '08:30'}_${workout.name.trim().toLowerCase()}_${workout.durationMinutes}`;
}

function chapterKey(chapter: ReportChapter): string {
  return `${chapter.id ?? `${chapter.number ?? 'x'}_${chapter.title ?? 'chapter'}`}_${chapter.dateCompleted ?? 'n/a'}`;
}

function percentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function directionFromDelta(delta: number): 'up' | 'down' | 'flat' {
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'flat';
}

function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 5) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return numerator / denominator;
}

function toLocalDayLabel(date: string, token: string): string {
  return format(new Date(`${date}T00:00:00`), token);
}

function formatHours(minutes: number): string {
  return `${(minutes / 60).toFixed(1)}h`;
}

function formatLiters(ml: number): string {
  return `${(ml / 1000).toFixed(1)}L`;
}

function dedupeProblems(problems: LeetCodeProblem[]): LeetCodeProblem[] {
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

function dedupeFocusSessions(sessions: FocusSession[]): FocusSession[] {
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

function dedupeWorkouts(workouts: WorkoutEntry[]): WorkoutEntry[] {
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

function dedupeSleepEntries(entries: SleepEntry[]): SleepEntry[] {
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

function dedupeChapters(chapters: ReportChapter[]): ReportChapter[] {
  const seen = new Set<string>();
  return chapters.filter((chapter) => {
    if (!chapter.completed || !chapter.dateCompleted) return false;
    const key = chapterKey(chapter);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function longestStreak(values: DailyReportPoint[], predicate: (point: DailyReportPoint) => boolean): number {
  let best = 0;
  let current = 0;

  for (const value of values) {
    if (predicate(value)) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }

  return best;
}

function buildDailyBreakdown(params: {
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

  const focusMap = new Map<string, FocusSession[]>();
  for (const session of focusSessions) {
    const date = normalizeToLocalDateString(session.date || session.startTime);
    if (!date || !dates.includes(date)) continue;
    const list = focusMap.get(date) || [];
    list.push(session);
    focusMap.set(date, list);
  }

  const problemMap = new Map<string, LeetCodeProblem[]>();
  for (const problem of problems) {
    const date = normalizeToLocalDateString(problem.date);
    if (!date || !dates.includes(date)) continue;
    const list = problemMap.get(date) || [];
    list.push(problem);
    problemMap.set(date, list);
  }

  const waterMap = new Map<string, WaterEntry[]>();
  for (const water of waterEntries) {
    const date = normalizeToLocalDateString(water.date);
    if (!date || !dates.includes(date)) continue;
    const list = waterMap.get(date) || [];
    list.push(water);
    waterMap.set(date, list);
  }

  const sleepMap = new Map<string, SleepEntry>();
  for (const sleep of sleepEntries) {
    const date = normalizeToLocalDateString(sleep.date);
    if (!date || !dates.includes(date)) continue;
    const existing = sleepMap.get(date);
    if (!existing || sleep.totalMinutes > existing.totalMinutes) {
      sleepMap.set(date, sleep);
    }
  }

  const workoutMap = new Map<string, WorkoutEntry[]>();
  for (const workout of workouts) {
    const date = normalizeToLocalDateString(workout.date);
    if (!date || !dates.includes(date)) continue;
    const list = workoutMap.get(date) || [];
    list.push(workout);
    workoutMap.set(date, list);
  }

  const chapterMap = new Map<string, ReportChapter[]>();
  for (const chapter of chapters) {
    const date = normalizeToLocalDateString(chapter.dateCompleted || '');
    if (!date || !dates.includes(date)) continue;
    const list = chapterMap.get(date) || [];
    list.push(chapter);
    chapterMap.set(date, list);
  }

  const mealMap = new Map<string, MealEntry[]>();
  for (const meal of meals) {
    const date = normalizeToLocalDateString(meal.date);
    if (!date || !dates.includes(date)) continue;
    const list = mealMap.get(date) || [];
    list.push(meal);
    mealMap.set(date, list);
  }

  return dates.map((date) => {
    const daySessions = (focusMap.get(date) || []).filter((session) => session.completed);
    const focusMinutes = daySessions.reduce((total, session) => total + (safeNumber(session.actualDuration) || session.duration), 0);
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
      focusSessions: daySessions.length,
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

function aggregateDaily(points: DailyReportPoint[], targets: { waterGoalMl: number; sleepGoalMin: number }): AggregateTotals {
  return points.reduce<AggregateTotals>((totals, point) => {
    totals.focusMinutes += point.focusMinutes;
    totals.completedSessions += point.focusSessions;
    totals.totalSessions += point.focusSessions;
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

function buildComparisonRows(params: {
  current: AggregateTotals;
  previous: AggregateTotals;
  currentSleepAverageHours: number;
  previousSleepAverageHours: number;
  stepsGoalDaily: number;
}): WeeklyComparisonRow[] {
  const { current, previous, currentSleepAverageHours, previousSleepAverageHours } = params;

  return [
    {
      id: 'focus',
      label: 'Focus Hours',
      currentValue: formatHours(current.focusMinutes),
      previousValue: formatHours(previous.focusMinutes),
      deltaPct: percentageChange(current.focusMinutes, previous.focusMinutes),
      direction: directionFromDelta(percentageChange(current.focusMinutes, previous.focusMinutes)),
      source: 'focus_sessions',
    },
    {
      id: 'coding',
      label: 'Coding Solves',
      currentValue: `${current.problemsSolved}`,
      previousValue: `${previous.problemsSolved}`,
      deltaPct: percentageChange(current.problemsSolved, previous.problemsSolved),
      direction: directionFromDelta(percentageChange(current.problemsSolved, previous.problemsSolved)),
      source: 'validated_leetcode_problems',
    },
    {
      id: 'sleep',
      label: 'Sleep Average',
      currentValue: `${currentSleepAverageHours.toFixed(1)}h`,
      previousValue: `${previousSleepAverageHours.toFixed(1)}h`,
      deltaPct: percentageChange(currentSleepAverageHours, previousSleepAverageHours),
      direction: directionFromDelta(percentageChange(currentSleepAverageHours, previousSleepAverageHours)),
      source: 'sleep_logs',
    },
    {
      id: 'hydration',
      label: 'Hydration',
      currentValue: formatLiters(current.waterMl),
      previousValue: formatLiters(previous.waterMl),
      deltaPct: percentageChange(current.waterMl, previous.waterMl),
      direction: directionFromDelta(percentageChange(current.waterMl, previous.waterMl)),
      source: 'water_logs',
    },
    {
      id: 'steps',
      label: 'Steps',
      currentValue: `${Math.round(current.steps / 7).toLocaleString()}/day`,
      previousValue: `${Math.round(previous.steps / 7).toLocaleString()}/day`,
      deltaPct: percentageChange(current.steps, previous.steps),
      direction: directionFromDelta(percentageChange(current.steps, previous.steps)),
      source: 'steps_daily_totals',
    },
    {
      id: 'reading',
      label: 'Reading',
      currentValue: `${current.chaptersRead} chapters`,
      previousValue: `${previous.chaptersRead} chapters`,
      deltaPct: percentageChange(current.chaptersRead, previous.chaptersRead),
      direction: directionFromDelta(percentageChange(current.chaptersRead, previous.chaptersRead)),
      source: 'reading_chapters',
    },
    {
      id: 'workouts',
      label: 'Workouts',
      currentValue: `${current.workoutsCount}`,
      previousValue: `${previous.workoutsCount}`,
      deltaPct: percentageChange(current.workoutsCount, previous.workoutsCount),
      direction: directionFromDelta(percentageChange(current.workoutsCount, previous.workoutsCount)),
      source: 'workout_logs',
    },
  ];
}

function buildHeroMetrics(params: {
  current: AggregateTotals;
  previous: AggregateTotals;
  currentSleepAverageHours: number;
  previousSleepAverageHours: number;
  waterGoalMl: number;
  sleepGoalHours: number;
  stepsGoalDaily: number;
  weeklyPerformanceScore: number;
}): ReportMetricCard[] {
  const {
    current,
    previous,
    currentSleepAverageHours,
    previousSleepAverageHours,
    waterGoalMl,
    sleepGoalHours,
    stepsGoalDaily,
    weeklyPerformanceScore,
  } = params;

  return [
    {
      id: 'focus',
      label: 'Focus Hours',
      value: formatHours(current.focusMinutes),
      subtitle: `${current.completedSessions} completed sessions`,
      targetLabel: `${formatHours(FOCUS_WEEKLY_TARGET_MIN)} target`,
      deltaPct: percentageChange(current.focusMinutes, previous.focusMinutes),
      deltaLabel: 'vs last week',
      direction: directionFromDelta(percentageChange(current.focusMinutes, previous.focusMinutes)),
      progressPct: Math.min((current.focusMinutes / FOCUS_WEEKLY_TARGET_MIN) * 100, 100),
      source: 'focus_sessions',
    },
    {
      id: 'coding',
      label: 'Coding Solves',
      value: `${current.problemsSolved}`,
      subtitle: `${current.problemsDaysHit} active days`,
      targetLabel: `${CODING_WEEKLY_TARGET} weekly target`,
      deltaPct: percentageChange(current.problemsSolved, previous.problemsSolved),
      deltaLabel: 'vs last week',
      direction: directionFromDelta(percentageChange(current.problemsSolved, previous.problemsSolved)),
      progressPct: Math.min((current.problemsSolved / CODING_WEEKLY_TARGET) * 100, 100),
      source: 'validated_leetcode_problems',
    },
    {
      id: 'sleep',
      label: 'Sleep Average',
      value: `${currentSleepAverageHours.toFixed(1)}h`,
      subtitle: `${current.sleepDaysWithData} logged nights`,
      targetLabel: `${sleepGoalHours.toFixed(1)}h target`,
      deltaPct: percentageChange(currentSleepAverageHours, previousSleepAverageHours),
      deltaLabel: 'vs last week',
      direction: directionFromDelta(percentageChange(currentSleepAverageHours, previousSleepAverageHours)),
      progressPct: Math.min((currentSleepAverageHours / sleepGoalHours) * 100, 100),
      source: 'sleep_logs',
    },
    {
      id: 'hydration',
      label: 'Hydration',
      value: `${(current.waterMl / 7000).toFixed(1)}L/day`,
      subtitle: `${formatLiters(current.waterMl)} total`,
      targetLabel: `${(waterGoalMl / 1000).toFixed(1)}L/day target`,
      deltaPct: percentageChange(current.waterMl, previous.waterMl),
      deltaLabel: 'vs last week',
      direction: directionFromDelta(percentageChange(current.waterMl, previous.waterMl)),
      progressPct: Math.min((current.waterMl / (waterGoalMl * 7)) * 100, 100),
      source: 'water_logs',
    },
    {
      id: 'steps',
      label: 'Steps',
      value: `${Math.round(current.steps / 7).toLocaleString()}`,
      subtitle: `${current.steps.toLocaleString()} weekly total`,
      targetLabel: `${stepsGoalDaily.toLocaleString()}/day target`,
      deltaPct: percentageChange(current.steps, previous.steps),
      deltaLabel: 'vs last week',
      direction: directionFromDelta(percentageChange(current.steps, previous.steps)),
      progressPct: Math.min((current.steps / (stepsGoalDaily * 7)) * 100, 100),
      source: 'steps_daily_totals',
    },
    {
      id: 'score',
      label: 'Weekly Performance Score',
      value: `${weeklyPerformanceScore}`,
      subtitle: 'Composite trust score',
      targetLabel: '100-point scale',
      deltaPct: percentageChange(weeklyPerformanceScore, weeklyPerformanceScore),
      deltaLabel: 'composite',
      direction: 'flat',
      progressPct: weeklyPerformanceScore,
      source: 'canonical_weekly_report',
    },
  ];
}

function buildValidatedInsights(dailyBreakdown: DailyReportPoint[]): { insights: ValidatedInsight[]; fallback: string | null; correlationInsights: string[] } {
  const insights: ValidatedInsight[] = [];
  const correlationInsights: string[] = [];

  const sleepFocusPairs = dailyBreakdown.filter((point) => point.sleepMinutes > 0 && point.focusMinutes > 0);
  if (sleepFocusPairs.length >= 5) {
    const sleepValues = sleepFocusPairs.map((point) => point.sleepMinutes);
    const focusValues = sleepFocusPairs.map((point) => point.focusMinutes);
    const r = calculatePearsonCorrelation(sleepValues, focusValues);
    if (Math.abs(r) >= 0.45) {
      const confidence = Math.abs(r) >= 0.65 ? 'high' : 'medium';
      const direction = r > 0 ? 'rose' : 'fall';
      insights.push({
        id: 'sleep-focus-correlation',
        title: 'Sleep and focus moved together',
        body: `Across ${sleepFocusPairs.length} overlapping days, sleep duration and focus output showed a statistically meaningful ${r > 0 ? 'positive' : 'negative'} correlation (r = ${r.toFixed(2)}).`,
        confidence,
        source: 'sleep_logs + focus_sessions',
      });
      correlationInsights.push(`Sleep/focus correlation detected (${direction}, r = ${r.toFixed(2)}) across ${sleepFocusPairs.length} days.`);
    }
  }

  const hydrationFocusPairs = dailyBreakdown.filter((point) => point.hydrationMl > 0 && point.focusMinutes > 0);
  if (hydrationFocusPairs.length >= 5) {
    const hydrationValues = hydrationFocusPairs.map((point) => point.hydrationMl);
    const focusValues = hydrationFocusPairs.map((point) => point.focusMinutes);
    const r = calculatePearsonCorrelation(hydrationValues, focusValues);
    if (Math.abs(r) >= 0.45) {
      const confidence = Math.abs(r) >= 0.65 ? 'high' : 'medium';
      insights.push({
        id: 'hydration-focus-correlation',
        title: 'Hydration tracked with focus volume',
        body: `Hydration and focus showed a statistically valid ${r > 0 ? 'positive' : 'negative'} relationship (r = ${r.toFixed(2)}) across ${hydrationFocusPairs.length} overlapping days.`,
        confidence,
        source: 'water_logs + focus_sessions',
      });
      correlationInsights.push(`Hydration/focus correlation detected (r = ${r.toFixed(2)}) across ${hydrationFocusPairs.length} days.`);
    }
  }

  const fallback = insights.length === 0 ? 'Not enough reliable data for insight generation.' : null;
  if (fallback) {
    correlationInsights.push(fallback);
  }

  return { insights, fallback, correlationInsights };
}

function buildStatusLabel(params: {
  weeklyPerformanceScore: number;
  currentSleepAverageHours: number;
  sleepGoalHours: number;
  focusMinutes: number;
  focusChange: number;
  codingChange: number;
  waterDaysHit: number;
}): { label: string; tone: 'emerald' | 'amber' | 'rose' | 'violet' } {
  const {
    weeklyPerformanceScore,
    currentSleepAverageHours,
    sleepGoalHours,
    focusMinutes,
    focusChange,
    codingChange,
    waterDaysHit,
  } = params;

  if (weeklyPerformanceScore >= 82 && currentSleepAverageHours >= sleepGoalHours && waterDaysHit >= 4) {
    return { label: 'Peak Performance Week', tone: 'emerald' };
  }

  if (focusMinutes >= FOCUS_WEEKLY_TARGET_MIN && currentSleepAverageHours < sleepGoalHours) {
    return { label: 'Focused but Under-Recovered', tone: 'amber' };
  }

  if (focusChange > 0 || codingChange > 0) {
    return { label: 'Momentum Building', tone: 'violet' };
  }

  return { label: 'Recalibration Week', tone: 'rose' };
}

function buildCustomTrackerCards(trackers: Tracker[], last7Days: string[]): CustomTrackerWeeklySummary[] {
  const cards: CustomTrackerWeeklySummary[] = [];

  for (const tracker of trackers) {
    const relevantItems = tracker.items.filter((item) => {
      const date = normalizeToLocalDateString(item.dateCompleted || '');
      return !!date && last7Days.includes(date);
    });

    if (relevantItems.length === 0) continue;

    const completedCount = relevantItems.filter((item) => item.status === 'completed').length;
    const values = relevantItems.map((item) => item.value).filter((value): value is number => typeof value === 'number');
    const streakDays = (() => {
      let streak = 0;
      let best = 0;
      for (const date of last7Days) {
        const hasActivity = relevantItems.some((item) => normalizeToLocalDateString(item.dateCompleted || '') === date && item.status === 'completed');
        if (hasActivity) {
          streak += 1;
          best = Math.max(best, streak);
        } else {
          streak = 0;
        }
      }
      return best;
    })();

    const sumValue = values.length > 0 ? values.reduce((total, value) => total + value, 0) : undefined;
    const avgValue = values.length > 0 && sumValue !== undefined ? sumValue / values.length : undefined;
    const milestoneText = tracker.target
      ? `${completedCount}/${tracker.target} target progress`
      : `${completedCount}/${relevantItems.length} completed this week`;

    cards.push({
      trackerId: tracker.id,
      title: tracker.title,
      type: tracker.type,
      unit: tracker.unit,
      target: tracker.target,
      completedCount,
      totalLogged: relevantItems.length,
      sumValue,
      avgValue,
      streakDays,
      milestoneText,
    });
  }

  return cards;
}

export function calculateWeeklyReport(params: {
  focusSessions: FocusSession[];
  problems: LeetCodeProblem[];
  waterEntries: WaterEntry[];
  sleepEntries: SleepEntry[];
  workoutEntries: WorkoutEntry[];
  bookChapters: ReportChapter[];
  stepsData: Record<string, number>;
  healthGoals: HealthGoal[];
  last7Days: string[];
  prev7Days: string[];
  meals: MealEntry[];
  trackers: Tracker[];
}): WeeklyReportStats {
  const {
    focusSessions: rawFocusSessions,
    problems: rawProblems,
    waterEntries,
    sleepEntries: rawSleepEntries,
    workoutEntries: rawWorkoutEntries,
    bookChapters: rawBookChapters,
    stepsData,
    healthGoals,
    last7Days,
    prev7Days,
    meals,
    trackers,
  } = params;

  const waterGoalMl = healthGoals.find((goal) => goal.type === 'water')?.targetValue ?? 3000;
  const sleepGoalHours = healthGoals.find((goal) => goal.type === 'sleep_hours')?.targetValue ?? 7.5;
  const sleepGoalMin = sleepGoalHours * 60;
  const stepsGoalDaily = healthGoals.find((goal) => goal.type === 'steps')?.targetValue ?? 10000;
  const workoutGoalWeekly = healthGoals.find((goal) => goal.type === 'workouts_per_week')?.targetValue ?? 5;

  const focusSessions = dedupeFocusSessions(rawFocusSessions);
  const problems = dedupeProblems(rawProblems);
  const workouts = dedupeWorkouts(rawWorkoutEntries);
  const sleepEntries = dedupeSleepEntries(rawSleepEntries);
  const bookChapters = dedupeChapters(rawBookChapters);

  const dailyBreakdown = buildDailyBreakdown({
    dates: last7Days,
    focusSessions,
    problems,
    waterEntries,
    sleepEntries,
    workouts,
    chapters: bookChapters,
    stepsData,
    meals,
  });

  const previousBreakdown = buildDailyBreakdown({
    dates: prev7Days,
    focusSessions,
    problems,
    waterEntries,
    sleepEntries,
    workouts,
    chapters: bookChapters,
    stepsData,
    meals,
  });

  const current = aggregateDaily(dailyBreakdown, { waterGoalMl, sleepGoalMin });
  const previous = aggregateDaily(previousBreakdown, { waterGoalMl, sleepGoalMin });
  const currentSleepAverageHours = current.sleepDaysWithData > 0 ? current.sleepMinutes / current.sleepDaysWithData / 60 : 0;
  const previousSleepAverageHours = previous.sleepDaysWithData > 0 ? previous.sleepMinutes / previous.sleepDaysWithData / 60 : 0;

  const currentProblemsList = problems.filter((problem) => {
    const date = normalizeToLocalDateString(problem.date);
    return !!date && last7Days.includes(date) && problem.completed;
  });

  const completionRate = current.totalSessions > 0
    ? Math.round((current.completedSessions / current.totalSessions) * 100)
    : 100;

  const weeklyPerformanceScore = calculateFocusQualityScore({
    completedSessionsCount: current.completedSessions,
    totalSessionsCount: current.totalSessions,
    focusMinutes: current.focusMinutes,
    problemsSolvedList: currentProblemsList,
    chaptersRead: current.chaptersRead,
    consistencyDays: dailyBreakdown.filter((point) => point.focusMinutes > 0).length,
    averageSleepMinutes: currentSleepAverageHours * 60,
    sleepGoalMinutes: sleepGoalMin,
    focusGoalMinutes: FOCUS_WEEKLY_TARGET_MIN,
    codingGoalPoints: CODING_WEEKLY_TARGET,
  });

  const focusChange = percentageChange(current.focusMinutes, previous.focusMinutes);
  const codingChange = percentageChange(current.problemsSolved, previous.problemsSolved);
  const readingChange = percentageChange(current.chaptersRead, previous.chaptersRead);
  const waterChange = percentageChange(current.waterMl, previous.waterMl);
  const sleepChange = percentageChange(currentSleepAverageHours, previousSleepAverageHours);

  const bestFocusPoint = [...dailyBreakdown].sort((a, b) => b.focusMinutes - a.focusMinutes)[0];
  const bestCodingPoint = [...dailyBreakdown].sort((a, b) => b.codingSolved - a.codingSolved)[0];
  const weakestSleepPoint = dailyBreakdown
    .filter((point) => point.sleepMinutes > 0)
    .sort((a, b) => a.sleepMinutes - b.sleepMinutes)[0];
  const strongestDayPoint = [...dailyBreakdown].sort((a, b) => {
    const aScore = a.focusMinutes + a.codingSolved * 60 + a.readingChapters * 35 + a.workoutMinutes * 0.6;
    const bScore = b.focusMinutes + b.codingSolved * 60 + b.readingChapters * 35 + b.workoutMinutes * 0.6;
    return bScore - aScore;
  })[0];

  const longestFocusStreakDays = longestStreak(dailyBreakdown, (point) => point.focusMinutes > 0);
  const bestCodingStreakDays = longestStreak(dailyBreakdown, (point) => point.codingSolved > 0);

  const comparisonRows = buildComparisonRows({
    current,
    previous,
    currentSleepAverageHours,
    previousSleepAverageHours,
    stepsGoalDaily,
  });

  const biggestImprovementRow = [...comparisonRows].sort((a, b) => b.deltaPct - a.deltaPct)[0];
  const biggestImprovement = biggestImprovementRow && biggestImprovementRow.deltaPct > 0
    ? `${biggestImprovementRow.label} improved ${biggestImprovementRow.deltaPct}% week over week.`
    : 'No major week-over-week improvement was detected.';

  const { insights: validatedInsights, fallback: insightsFallback, correlationInsights } = buildValidatedInsights(dailyBreakdown);
  const status = buildStatusLabel({
    weeklyPerformanceScore,
    currentSleepAverageHours,
    sleepGoalHours,
    focusMinutes: current.focusMinutes,
    focusChange,
    codingChange,
    waterDaysHit: current.waterDaysHit,
  });

  const weeklyNarrativeParts: string[] = [];
  if (bestCodingPoint && bestCodingPoint.codingSolved > 0) {
    weeklyNarrativeParts.push(`${bestCodingPoint.fullLabel} was your strongest coding day with ${bestCodingPoint.codingSolved} accepted solve${bestCodingPoint.codingSolved === 1 ? '' : 's'}.`);
  }
  if (weakestSleepPoint && weakestSleepPoint.sleepMinutes > 0) {
    const nextDay = dailyBreakdown[dailyBreakdown.findIndex((point) => point.date === weakestSleepPoint.date) + 1];
    if (nextDay && nextDay.focusMinutes < (current.focusMinutes / 7)) {
      weeklyNarrativeParts.push(`Sleep dropped below target on ${toLocalDayLabel(weakestSleepPoint.date, 'EEEE')}, followed by lighter focus output on ${toLocalDayLabel(nextDay.date, 'EEEE')}.`);
    }
  }
  if (waterChange !== 0) {
    weeklyNarrativeParts.push(`Hydration ${waterChange > 0 ? 'improved' : 'declined'} ${Math.abs(waterChange)}% compared with last week.`);
  }
  if (bestFocusPoint && bestFocusPoint.focusMinutes > 0) {
    weeklyNarrativeParts.push(`${bestFocusPoint.fullLabel} led your week for deep work with ${formatHours(bestFocusPoint.focusMinutes)} of focus.`);
  }

  if (weeklyNarrativeParts.length === 0) {
    weeklyNarrativeParts.push('This week logged real activity, but there was not enough movement across core metrics to generate a stronger narrative signal.');
  }

  const wins = [
    strongestDayPoint
      ? `${strongestDayPoint.shortLabel} was the strongest all-around day, led by ${formatHours(strongestDayPoint.focusMinutes)} focus and ${strongestDayPoint.codingSolved} coding solve${strongestDayPoint.codingSolved === 1 ? '' : 's'}.`
      : 'No standout day was detected.',
    `Longest focus streak: ${longestFocusStreakDays} day${longestFocusStreakDays === 1 ? '' : 's'} with logged deep work.`,
    `Best coding streak: ${bestCodingStreakDays} day${bestCodingStreakDays === 1 ? '' : 's'} with accepted solves.`,
    biggestImprovement,
  ];

  const risks: string[] = [];
  if (currentSleepAverageHours < sleepGoalHours) {
    risks.push(`Recovery averaged ${currentSleepAverageHours.toFixed(1)}h against a ${sleepGoalHours.toFixed(1)}h target.`);
  }
  if (current.waterDaysHit < 4) {
    risks.push(`Hydration target was only met on ${current.waterDaysHit} of 7 days.`);
  }
  if (current.problemsSolved === 0) {
    risks.push('No validated coding solves were recorded this week.');
  }
  if (current.chaptersRead === 0) {
    risks.push('Reading progress stalled with zero completed chapters.');
  }
  if (current.workoutsCount === 0) {
    risks.push('No workout logs were recorded, reducing health-context reliability for the week.');
  }
  if (risks.length === 0) {
    risks.push('No major recovery or consistency risks were detected from the recorded data.');
  }

  const recommendations: string[] = [];
  if (currentSleepAverageHours < sleepGoalHours) {
    recommendations.push(`Protect recovery by raising average sleep toward ${sleepGoalHours.toFixed(1)}h before pushing more focus volume.`);
  }
  if (current.waterDaysHit < 4) {
    recommendations.push(`Anchor hydration earlier in the day to reach ${(waterGoalMl / 1000).toFixed(1)}L more consistently.`);
  }
  if (current.problemsSolved < CODING_WEEKLY_TARGET) {
    recommendations.push(`Schedule one dedicated coding block on your lightest day to close the gap to ${CODING_WEEKLY_TARGET} weekly solves.`);
  }
  if (current.workoutsCount < workoutGoalWeekly) {
    recommendations.push(`Spread shorter movement sessions across the week to approach your ${workoutGoalWeekly} workout target.`);
  }
  if (recommendations.length === 0) {
    recommendations.push('Keep the current balance; the recorded data supports continuing your existing routine.');
  }

  const actionPlan = [
    `Protect one ${Math.max(25, Math.round(FOCUS_WEEKLY_TARGET_MIN / 5))}-minute focus block on your historically weakest focus day.`,
    `Raise hydration consistency to at least 4/7 target-hit days next week.`,
    `Use ${bestCodingPoint?.shortLabel || 'your best coding day'} as the template for next week’s coding schedule.`,
  ];

  const customTrackerCards = buildCustomTrackerCards(trackers, last7Days);
  const heroMetrics = buildHeroMetrics({
    current,
    previous,
    currentSleepAverageHours,
    previousSleepAverageHours,
    waterGoalMl,
    sleepGoalHours,
    stepsGoalDaily,
    weeklyPerformanceScore,
  });

  const radarMetrics = [
    { label: 'Focus', value: Math.min(Math.round((current.focusMinutes / FOCUS_WEEKLY_TARGET_MIN) * 100), 100) },
    { label: 'Coding', value: Math.min(Math.round((current.problemsSolved / CODING_WEEKLY_TARGET) * 100), 100) },
    { label: 'Sleep', value: Math.min(Math.round((currentSleepAverageHours / sleepGoalHours) * 100), 100) },
    { label: 'Hydration', value: Math.min(Math.round((current.waterMl / (waterGoalMl * 7)) * 100), 100) },
    { label: 'Steps', value: Math.min(Math.round((current.steps / (stepsGoalDaily * 7)) * 100), 100) },
    { label: 'Workouts', value: Math.min(Math.round((current.workoutsCount / workoutGoalWeekly) * 100), 100) },
  ];

  const metricSources = [
    { id: 'focus', label: 'Focus', source: 'focus_sessions' },
    { id: 'coding', label: 'Coding', source: 'validated_leetcode_problems' },
    { id: 'hydration', label: 'Hydration', source: 'water_logs' },
    { id: 'sleep', label: 'Sleep', source: 'sleep_logs' },
    { id: 'workouts', label: 'Workouts', source: 'workout_logs' },
    { id: 'steps', label: 'Steps', source: 'steps_daily_totals' },
    { id: 'calories-in', label: 'Calories Consumed', source: 'nutrition_logs' },
    { id: 'calories-out', label: 'Calories Burned', source: 'validated_workout_burn' },
    { id: 'reading', label: 'Reading', source: 'completed_chapters' },
    { id: 'custom-trackers', label: 'Custom Trackers', source: 'tracker_items' },
  ];

  const codingProblemsThisWeek = problems.filter((problem) => {
    const date = normalizeToLocalDateString(problem.date);
    return date ? last7Days.includes(date) : false;
  });

  const solvedCodingProblems = codingProblemsThisWeek.filter((problem) => problem.completed && problem.status === 'solved');
  const unsolvedCodingProblems = codingProblemsThisWeek.filter((problem) => !problem.completed || problem.status !== 'solved');
  const difficultyWeight = (difficulty: string) => (difficulty === 'Hard' ? 3 : difficulty === 'Medium' ? 2 : 1);
  const hardestSolvedProblem = solvedCodingProblems
    .slice()
    .sort((a, b) => difficultyWeight(b.difficulty) - difficultyWeight(a.difficulty) || safeNumber(b.timeSpent) - safeNumber(a.timeSpent))[0] ?? null;

  let acceptanceStreakDays = 0;
  let currentAcceptanceStreak = 0;
  for (const date of last7Days) {
    const solvedThatDay = solvedCodingProblems.some((problem) => normalizeToLocalDateString(problem.date) === date);
    if (solvedThatDay) {
      currentAcceptanceStreak += 1;
      acceptanceStreakDays = Math.max(acceptanceStreakDays, currentAcceptanceStreak);
    } else {
      currentAcceptanceStreak = 0;
    }
  }

  const solvedWithTiming = solvedCodingProblems.filter((problem) => safeNumber(problem.timeSpent) > 0);
  const averageSolveTimeMinutes = solvedWithTiming.length > 0
    ? Math.round(solvedWithTiming.reduce((sum, problem) => sum + safeNumber(problem.timeSpent), 0) / solvedWithTiming.length)
    : null;

  const topicWeaknessMap = Array.from(
    unsolvedCodingProblems.reduce((map, problem) => {
      const key = problem.topic || 'Unknown';
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>())
  )
    .map(([topic, outstandingCount]) => ({ topic, outstandingCount }))
    .sort((a, b) => b.outstandingCount - a.outstandingCount)
    .slice(0, 5);

  const revisitFailureList = unsolvedCodingProblems
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map((problem) => ({
      name: problem.name,
      difficulty: problem.difficulty,
      topic: problem.topic || 'Unknown',
      date: normalizeToLocalDateString(problem.date) ?? problem.date,
    }));

  const spacedRepetitionQueue = solvedCodingProblems
    .filter((problem) => safeNumber(problem.timeSpent) > 0 || problem.difficulty !== 'Easy')
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)
    .map((problem) => ({
      name: problem.name,
      difficulty: problem.difficulty,
      topic: problem.topic || 'Unknown',
      date: normalizeToLocalDateString(problem.date) ?? problem.date,
    }));

  const codingAnalytics = {
    acceptanceStreakDays,
    hardestSolvedProblem: hardestSolvedProblem?.name ?? null,
    averageSolveTimeMinutes,
    topicWeaknessMap,
    revisitFailureList,
    spacedRepetitionQueue,
  };

  let problemsSolvedReflections = 0;
  let learningMinutesReflections = 0;
  let pagesReadReflections = 0;
  let featuresShippedReflections = 0;
  for (const session of focusSessions) {
    const date = normalizeToLocalDateString(session.date || session.startTime);
    if (!date || !last7Days.includes(date) || !session.completed || !session.reflection) continue;
    try {
      const parsed = JSON.parse(session.reflection) as {
        quantities?: {
          problemsSolved?: number;
          minutesOfLearning?: number;
          pagesRead?: number;
          featuresShipped?: number;
        };
      };
      problemsSolvedReflections += safeNumber(parsed.quantities?.problemsSolved);
      learningMinutesReflections += safeNumber(parsed.quantities?.minutesOfLearning);
      pagesReadReflections += safeNumber(parsed.quantities?.pagesRead);
      featuresShippedReflections += safeNumber(parsed.quantities?.featuresShipped);
    } catch {
      // Ignore free-form reflections.
    }
  }

  return {
    focusMinutes: current.focusMinutes,
    completedSessions: current.completedSessions,
    completionRate,
    focusQualityScore: weeklyPerformanceScore,
    problemsSolved: current.problemsSolved,
    chaptersRead: current.chaptersRead,
    waterAverageL: (current.waterMl / 7000).toFixed(1),
    sleepAverageH: currentSleepAverageHours.toFixed(1),
    workoutCount: current.workoutsCount,
    stepsAverage: Math.round(current.steps / 7),
    focusChange,
    codingChange,
    readingChange,
    waterChange,
    sleepChange,
    bestFocusDay: bestFocusPoint ? toLocalDayLabel(bestFocusPoint.date, 'EEEE') : 'N/A',
    bestCodingDay: bestCodingPoint ? toLocalDayLabel(bestCodingPoint.date, 'EEEE') : 'N/A',
    weakestSleepDay: weakestSleepPoint ? toLocalDayLabel(weakestSleepPoint.date, 'EEEE') : 'N/A',
    problemsSolvedReflections,
    learningMinutesReflections,
    pagesReadReflections,
    featuresShippedReflections,
    correlationInsights,
    wins,
    risks,
    recommendations,
    actionPlan,
    waterDaysHit: current.waterDaysHit,
    sleepDaysHit: current.sleepDaysHit,
    problemsDaysHit: current.problemsDaysHit,
    readingDaysHit: current.readingDaysHit,
    focusChartData: dailyBreakdown.map((point) => point.focusMinutes),
    codingChartData: dailyBreakdown.map((point) => point.codingSolved),
    waterChartData: dailyBreakdown.map((point) => point.hydrationMl),
    sleepChartData: dailyBreakdown.map((point) => point.sleepMinutes),
    readingChartData: dailyBreakdown.map((point) => point.readingChapters),
    sleepDaysWithData: current.sleepDaysWithData,
    totalCaloriesTaken: current.caloriesIn,
    totalCaloriesBurnt: current.caloriesOut,
    totalWaterIntakeMl: current.waterMl,
    trackerSummaries: customTrackerCards,
    cycleStart: last7Days[0],
    cycleEnd: last7Days[last7Days.length - 1],
    previousCycleStart: prev7Days[0],
    previousCycleEnd: prev7Days[prev7Days.length - 1],
    weeklyPerformanceScore,
    statusLabel: status.label,
    statusTone: status.tone,
    heroMetrics,
    dailyBreakdown,
    comparisonRows,
    validatedInsights,
    insightsFallback,
    weeklyNarrative: weeklyNarrativeParts.join(' '),
    longestFocusStreakDays,
    bestCodingStreakDays,
    strongestDayLabel: strongestDayPoint?.fullLabel || 'No strongest day detected',
    strongestDayReason: strongestDayPoint
      ? `${formatHours(strongestDayPoint.focusMinutes)} focus, ${strongestDayPoint.codingSolved} solves, ${strongestDayPoint.readingChapters} chapters, ${strongestDayPoint.workoutCount} workouts.`
      : 'Not enough activity was logged to determine a strongest day.',
    biggestImprovement,
    customTrackerCards,
    radarMetrics,
    codingAnalytics,
    metricSources,
  };
}
