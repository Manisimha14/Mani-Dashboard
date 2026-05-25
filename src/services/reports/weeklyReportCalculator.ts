import { format } from 'date-fns';
import { normalizeToLocalDateString } from '../../utils/dateNormalization';
import { calculateFocusQualityScore } from '../../utils/scoring';
import type { FocusSession, LeetCodeProblem, Tracker } from '../../types';
import type { WaterEntry, SleepEntry, WorkoutEntry, HealthGoal, MealEntry } from '../../types/health';
import type {
  CustomTrackerWeeklySummary,
  ReportMetricCard,
  WeeklyComparisonRow,
  WeeklyReportStats,
} from '../../types/report';

import {
  dedupeFocusSessions,
  dedupeProblems,
  dedupeWorkouts,
  dedupeSleepEntries,
  dedupeChapters,
  safeNumber,
  type ReportChapter,
} from './analytics/dedupe';

import {
  buildDailyBreakdown,
  aggregateDaily,
  type DailyReportPoint,
  type AggregateTotals,
} from './analytics/aggregation';

import {
  buildValidatedInsights,
} from './analytics/correlations';

const CODING_WEEKLY_TARGET = 7;
const READING_WEEKLY_TARGET = 3;
const FOCUS_WEEKLY_TARGET_MIN = 300;

function percentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function directionFromDelta(delta: number): 'up' | 'down' | 'flat' {
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'flat';
}

function toLocalDayLabel(date: string, token: string): string {
  // Avoid timezone shift using Z-string standard
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', token === 'EEE' ? { weekday: 'short' } : { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatHours(minutes: number): string {
  return `${(minutes / 60).toFixed(1)}h`;
}

function formatLiters(ml: number): string {
  return `${(ml / 1000).toFixed(1)}L`;
}

function longestStreak(values: { focusMinutes: number; codingSolved: number }[], predicate: (point: { focusMinutes: number; codingSolved: number }) => boolean): number {
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

function buildComparisonRows(params: {
  current: AggregateTotals;
  previous: AggregateTotals;
  currentSleepAverageHours: number;
  previousSleepAverageHours: number;
  periodDays: number;
}): WeeklyComparisonRow[] {
  const { current, previous, currentSleepAverageHours, previousSleepAverageHours, periodDays } = params;

  const focusChange = percentageChange(current.focusMinutes, previous.focusMinutes);
  const codingChange = percentageChange(current.problemsSolved, previous.problemsSolved);
  const sleepChange = percentageChange(currentSleepAverageHours, previousSleepAverageHours);
  const waterChange = percentageChange(current.waterMl, previous.waterMl);
  const stepsChange = percentageChange(current.steps, previous.steps);
  const readingChange = percentageChange(current.chaptersRead, previous.chaptersRead);
  const workoutsChange = percentageChange(current.workoutsCount, previous.workoutsCount);

  return [
    {
      id: 'focus',
      label: 'Focus Hours',
      currentValue: formatHours(current.focusMinutes),
      previousValue: formatHours(previous.focusMinutes),
      deltaPct: focusChange,
      direction: directionFromDelta(focusChange),
      source: 'focus_sessions',
    },
    {
      id: 'coding',
      label: 'Coding Solves',
      currentValue: `${current.problemsSolved}`,
      previousValue: `${previous.problemsSolved}`,
      deltaPct: codingChange,
      direction: directionFromDelta(codingChange),
      source: 'validated_leetcode_problems',
    },
    {
      id: 'sleep',
      label: 'Sleep Average',
      currentValue: `${currentSleepAverageHours.toFixed(1)}h`,
      previousValue: `${previousSleepAverageHours.toFixed(1)}h`,
      deltaPct: sleepChange,
      direction: directionFromDelta(sleepChange),
      source: 'sleep_logs',
    },
    {
      id: 'hydration',
      label: 'Hydration',
      currentValue: formatLiters(current.waterMl),
      previousValue: formatLiters(previous.waterMl),
      deltaPct: waterChange,
      direction: directionFromDelta(waterChange),
      source: 'water_logs',
    },
    {
      id: 'steps',
      label: 'Steps',
      currentValue: `${Math.round(current.steps / periodDays).toLocaleString()}/day`,
      previousValue: `${Math.round(previous.steps / periodDays).toLocaleString()}/day`,
      deltaPct: stepsChange,
      direction: directionFromDelta(stepsChange),
      source: 'steps_daily_totals',
    },
    {
      id: 'reading',
      label: 'Reading',
      currentValue: `${current.chaptersRead} chapters`,
      previousValue: `${previous.chaptersRead} chapters`,
      deltaPct: readingChange,
      direction: directionFromDelta(readingChange),
      source: 'reading_chapters',
    },
    {
      id: 'workouts',
      label: 'Workouts',
      currentValue: `${current.workoutsCount}`,
      previousValue: `${previous.workoutsCount}`,
      deltaPct: workoutsChange,
      direction: directionFromDelta(workoutsChange),
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
  focusGoalWeeklyMin: number;
  codingGoalWeekly: number;
  periodDays: number;
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
    focusGoalWeeklyMin,
    codingGoalWeekly,
    periodDays,
  } = params;

  const focusChange = percentageChange(current.focusMinutes, previous.focusMinutes);
  const codingChange = percentageChange(current.problemsSolved, previous.problemsSolved);
  const sleepChange = percentageChange(currentSleepAverageHours, previousSleepAverageHours);
  const waterChange = percentageChange(current.waterMl, previous.waterMl);
  const stepsChange = percentageChange(current.steps, previous.steps);

  return [
    {
      id: 'focus',
      label: 'Focus Hours',
      value: formatHours(current.focusMinutes),
      subtitle: `${current.completedSessions} completed sessions`,
      targetLabel: `${formatHours(focusGoalWeeklyMin)} target`,
      deltaPct: focusChange,
      deltaLabel: 'vs last week',
      direction: directionFromDelta(focusChange),
      progressPct: Math.min((current.focusMinutes / focusGoalWeeklyMin) * 100, 100),
      source: 'focus_sessions',
    },
    {
      id: 'coding',
      label: 'Coding Solves',
      value: `${current.problemsSolved}`,
      subtitle: `${current.problemsDaysHit} active days`,
      targetLabel: `${codingGoalWeekly} weekly target`,
      deltaPct: codingChange,
      deltaLabel: 'vs last week',
      direction: directionFromDelta(codingChange),
      progressPct: Math.min((current.problemsSolved / codingGoalWeekly) * 100, 100),
      source: 'validated_leetcode_problems',
    },
    {
      id: 'sleep',
      label: 'Sleep Average',
      value: `${currentSleepAverageHours.toFixed(1)}h`,
      subtitle: `${current.sleepDaysWithData} logged nights`,
      targetLabel: `${sleepGoalHours.toFixed(1)}h target`,
      deltaPct: sleepChange,
      deltaLabel: 'vs last week',
      direction: directionFromDelta(sleepChange),
      progressPct: Math.min((currentSleepAverageHours / sleepGoalHours) * 100, 100),
      source: 'sleep_logs',
    },
    {
      id: 'hydration',
      label: 'Hydration',
      value: `${(current.waterMl / (periodDays * 1000)).toFixed(1)}L/day`,
      subtitle: `${formatLiters(current.waterMl)} total`,
      targetLabel: `${(waterGoalMl / 1000).toFixed(1)}L/day target`,
      deltaPct: waterChange,
      deltaLabel: 'vs last week',
      direction: directionFromDelta(waterChange),
      progressPct: Math.min((current.waterMl / (waterGoalMl * periodDays)) * 100, 100),
      source: 'water_logs',
    },
    {
      id: 'steps',
      label: 'Steps',
      value: `${Math.round(current.steps / periodDays).toLocaleString()}`,
      subtitle: `${current.steps.toLocaleString()} weekly total`,
      targetLabel: `${stepsGoalDaily.toLocaleString()}/day target`,
      deltaPct: stepsChange,
      deltaLabel: 'vs last week',
      direction: directionFromDelta(stepsChange),
      progressPct: Math.min((current.steps / (stepsGoalDaily * periodDays)) * 100, 100),
      source: 'steps_daily_totals',
    },
    {
      id: 'score',
      label: 'Weekly Performance Score',
      value: `${weeklyPerformanceScore}`,
      subtitle: 'Composite trust score',
      targetLabel: '100-point scale',
      deltaPct: 0,
      deltaLabel: 'composite',
      direction: 'flat',
      progressPct: weeklyPerformanceScore,
      source: 'canonical_weekly_report',
    },
  ];
}

function buildStatusLabel(params: {
  weeklyPerformanceScore: number;
  currentSleepAverageHours: number;
  sleepGoalHours: number;
  focusMinutes: number;
  focusChange: number;
  codingChange: number;
  waterDaysHit: number;
  focusGoalWeeklyMin: number;
}): { label: string; tone: 'emerald' | 'amber' | 'rose' | 'violet' } {
  const {
    weeklyPerformanceScore,
    currentSleepAverageHours,
    sleepGoalHours,
    focusMinutes,
    focusChange,
    codingChange,
    waterDaysHit,
    focusGoalWeeklyMin,
  } = params;

  if (weeklyPerformanceScore >= 82 && currentSleepAverageHours >= sleepGoalHours && waterDaysHit >= 4) {
    return { label: 'Peak Performance Week', tone: 'emerald' };
  }

  if (focusMinutes >= focusGoalWeeklyMin && currentSleepAverageHours < sleepGoalHours) {
    return { label: 'Focused but Under-Recovered', tone: 'amber' };
  }

  if (focusChange > 0 || codingChange > 0) {
    return { label: 'Momentum Building', tone: 'violet' };
  }

  return { label: 'Recalibration Week', tone: 'rose' };
}

function buildCustomTrackerCards(trackers: Tracker[], last7Days: string[]): CustomTrackerWeeklySummary[] {
  const cards: CustomTrackerWeeklySummary[] = [];
  const dateSet = new Set(last7Days);

  for (const tracker of trackers) {
    const relevantItems = tracker.items.filter((item) => {
      const date = normalizeToLocalDateString(item.dateCompleted || '');
      return !!date && dateSet.has(date);
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

  const dateSet = new Set(last7Days);
  const periodDays = last7Days.length || 7;

  // Resolve target goals dynamically from healthGoals with standard static defaults
  const waterGoalMl = healthGoals.find((goal) => goal.type === 'water')?.targetValue ?? 3000;
  const sleepGoalHours = healthGoals.find((goal) => goal.type === 'sleep_hours')?.targetValue ?? 7.5;
  const sleepGoalMin = sleepGoalHours * 60;
  const stepsGoalDaily = healthGoals.find((goal) => goal.type === 'steps')?.targetValue ?? 10000;
  const workoutGoalWeekly = healthGoals.find((goal) => goal.type === 'workouts_per_week')?.targetValue ?? 5;

  const codingGoalWeekly = healthGoals.find((g) => g.type === 'custom' && g.label.toLowerCase().includes('coding'))?.targetValue ?? CODING_WEEKLY_TARGET;
  const readingGoalWeekly = healthGoals.find((g) => g.type === 'custom' && g.label.toLowerCase().includes('reading'))?.targetValue ?? READING_WEEKLY_TARGET;
  const focusGoalWeeklyMin = healthGoals.find((g) => g.type === 'custom' && g.label.toLowerCase().includes('focus'))?.targetValue ?? FOCUS_WEEKLY_TARGET_MIN;

  const focusSessions = dedupeFocusSessions(rawFocusSessions);
  const problems = dedupeProblems(rawProblems);
  const workouts = dedupeWorkouts(rawWorkoutEntries);
  const sleepEntries = dedupeSleepEntries(rawSleepEntries);
  const bookChapters = dedupeChapters(rawBookChapters);

  const dailyBreakdownRaw = buildDailyBreakdown({
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

  const previousBreakdownRaw = buildDailyBreakdown({
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

  const dailyBreakdown = dailyBreakdownRaw.map((p) => ({
    date: p.date,
    shortLabel: p.shortLabel,
    fullLabel: p.fullLabel,
    focusMinutes: p.focusMinutes,
    focusSessions: p.focusSessionsCompleted, // Keep perfectly compatible with WeeklyReportStats.dailyBreakdown format
    codingSolved: p.codingSolved,
    codingNames: p.codingNames,
    hydrationMl: p.hydrationMl,
    sleepMinutes: p.sleepMinutes,
    steps: p.steps,
    caloriesIn: p.caloriesIn,
    caloriesOut: p.caloriesOut,
    readingChapters: p.readingChapters,
    workoutCount: p.workoutCount,
    workoutMinutes: p.workoutMinutes,
    workoutNames: p.workoutNames,
  }));

  const current = aggregateDaily(dailyBreakdownRaw, { waterGoalMl, sleepGoalMin });
  const previous = aggregateDaily(previousBreakdownRaw, { waterGoalMl, sleepGoalMin });

  // Prevent recovery average score inflation: provide both logged-day average and calendar average
  const currentSleepAverageHours = current.sleepDaysWithData > 0 ? current.sleepMinutes / current.sleepDaysWithData / 60 : 0;
  const previousSleepAverageHours = previous.sleepDaysWithData > 0 ? previous.sleepMinutes / previous.sleepDaysWithData / 60 : 0;

  const currentSleepCalendarAverageHours = current.sleepMinutes / periodDays / 60;

  const currentProblemsList = problems.filter((problem) => {
    const date = normalizeToLocalDateString(problem.date);
    return !!date && dateSet.has(date) && problem.completed;
  });

  // Safe completion rate calculation
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
    focusGoalMinutes: focusGoalWeeklyMin,
    codingGoalPoints: codingGoalWeekly,
  });

  const focusChange = percentageChange(current.focusMinutes, previous.focusMinutes);
  const codingChange = percentageChange(current.problemsSolved, previous.problemsSolved);
  const readingChange = percentageChange(current.chaptersRead, previous.chaptersRead);
  const waterChange = percentageChange(current.waterMl, previous.waterMl);
  const sleepChange = percentageChange(currentSleepAverageHours, previousSleepAverageHours);

  // Single-pass reduction O(N) to discover extreme metric points (replaces multiple repeated O(N log N) sorts)
  let bestFocusPoint = dailyBreakdown[0] || null;
  let bestCodingPoint = dailyBreakdown[0] || null;
  let weakestSleepPoint = null;
  let strongestDayPoint = dailyBreakdown[0] || null;
  let strongestDayScore = -1;

  for (const point of dailyBreakdown) {
    if (!bestFocusPoint || point.focusMinutes > bestFocusPoint.focusMinutes) {
      bestFocusPoint = point;
    }
    if (!bestCodingPoint || point.codingSolved > bestCodingPoint.codingSolved) {
      bestCodingPoint = point;
    }
    if (point.sleepMinutes > 0) {
      if (!weakestSleepPoint || point.sleepMinutes < weakestSleepPoint.sleepMinutes) {
        weakestSleepPoint = point;
      }
    }
    const score = point.focusMinutes + point.codingSolved * 60 + point.readingChapters * 35 + point.workoutMinutes * 0.6;
    if (score > strongestDayScore) {
      strongestDayScore = score;
      strongestDayPoint = point;
    }
  }

  const longestFocusStreakDays = longestStreak(dailyBreakdown, (point) => point.focusMinutes > 0);
  const bestCodingStreakDays = longestStreak(dailyBreakdown, (point) => point.codingSolved > 0);

  const comparisonRows = buildComparisonRows({
    current,
    previous,
    currentSleepAverageHours,
    previousSleepAverageHours,
    periodDays,
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
    focusGoalWeeklyMin,
  });

  const weeklyNarrativeParts: string[] = [];
  if (bestCodingPoint && bestCodingPoint.codingSolved > 0) {
    weeklyNarrativeParts.push(`${bestCodingPoint.fullLabel} was your strongest coding day with ${bestCodingPoint.codingSolved} accepted solve${bestCodingPoint.codingSolved === 1 ? '' : 's'}.`);
  }
  if (weakestSleepPoint && weakestSleepPoint.sleepMinutes > 0) {
    const nextDay = dailyBreakdown[dailyBreakdown.findIndex((point) => point.date === weakestSleepPoint.date) + 1];
    if (nextDay && nextDay.focusMinutes < (current.focusMinutes / periodDays)) {
      // Softened causal framing to maintain high factual confidence standards
      weeklyNarrativeParts.push(`Sleep dropped below target on ${toLocalDayLabel(weakestSleepPoint.date, 'EEEE')}, which coincided with lighter focus output on ${toLocalDayLabel(nextDay.date, 'EEEE')}.`);
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
    risks.push(`Hydration target was only met on ${current.waterDaysHit} of ${periodDays} days.`);
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
  if (current.problemsSolved < codingGoalWeekly) {
    recommendations.push(`Schedule one dedicated coding block on your lightest day to close the gap to ${codingGoalWeekly} weekly solves.`);
  }
  if (current.workoutsCount < workoutGoalWeekly) {
    recommendations.push(`Spread shorter movement sessions across the week to approach your ${workoutGoalWeekly} workout target.`);
  }
  if (recommendations.length === 0) {
    recommendations.push('Keep the current balance; the recorded data supports continuing your existing routine.');
  }

  const actionPlan = [
    `Protect one ${Math.max(25, Math.round(focusGoalWeeklyMin / 5))}-minute focus block on your historically weakest focus day.`,
    `Raise hydration consistency to at least 4/${periodDays} target-hit days next week.`,
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
    focusGoalWeeklyMin,
    codingGoalWeekly,
    periodDays,
  });

  const radarMetrics = [
    { label: 'Focus', value: Math.min(Math.round((current.focusMinutes / focusGoalWeeklyMin) * 100), 100) },
    { label: 'Coding', value: Math.min(Math.round((current.problemsSolved / codingGoalWeekly) * 100), 100) },
    { label: 'Sleep', value: Math.min(Math.round((currentSleepAverageHours / sleepGoalHours) * 100), 100) },
    { label: 'Hydration', value: Math.min(Math.round((current.waterMl / (waterGoalMl * periodDays)) * 100), 100) },
    { label: 'Steps', value: Math.min(Math.round((current.steps / (stepsGoalDaily * periodDays)) * 100), 100) },
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
    return date ? dateSet.has(date) : false;
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

  // Safe and clean parser that handles JSON reflections without parsing redundant details
  let problemsSolvedReflections = 0;
  let learningMinutesReflections = 0;
  let pagesReadReflections = 0;
  let featuresShippedReflections = 0;

  for (const session of focusSessions) {
    const date = normalizeToLocalDateString(session.date || session.startTime);
    if (!date || !dateSet.has(date) || !session.completed || !session.reflection) continue;
    try {
      const parsed = JSON.parse(session.reflection);
      if (parsed?.quantities) {
        problemsSolvedReflections += safeNumber(parsed.quantities.problemsSolved);
        learningMinutesReflections += safeNumber(parsed.quantities.minutesOfLearning);
        pagesReadReflections += safeNumber(parsed.quantities.pagesRead);
        featuresShippedReflections += safeNumber(parsed.quantities.featuresShipped);
      }
    } catch {
      // Ignore free-form reflections
    }
  }

  return {
    focusMinutes: current.focusMinutes,
    completedSessions: current.completedSessions,
    completionRate,
    focusQualityScore: weeklyPerformanceScore,
    problemsSolved: current.problemsSolved,
    chaptersRead: current.chaptersRead,
    waterAverageL: (current.waterMl / (periodDays * 1000)).toFixed(1),
    sleepAverageH: currentSleepAverageHours.toFixed(1),
    sleepCalendarAverageH: currentSleepCalendarAverageHours.toFixed(1),
    workoutCount: current.workoutsCount,
    stepsAverage: Math.round(current.steps / periodDays),
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
