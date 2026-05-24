import { format } from 'date-fns';
import { normalizeToLocalDateString } from '../../utils/dateNormalization';
import { calculateFocusQualityScore } from '../../utils/scoring';
import type { FocusSession, LeetCodeProblem, Tracker } from '../../types';
import type { WaterEntry, SleepEntry, WorkoutEntry, HealthGoal, MealEntry } from '../../types/health';
import type { IndexedReportData, WeeklyReportStats } from '../../types/report';

/**
 * Calculates the Pearson correlation coefficient (r) between two datasets.
 * Requires at least 4 overlapping data points to yield a statistically valid result.
 */
function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 4) return 0;

  let sumX = 0, sumY = 0, sumXY = 0;
  let sumX2 = 0, sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (den === 0) return 0;
  return num / den;
}

/**
 * Calculates complete weekly analytics and aggregates from raw data streams.
 */
export function calculateWeeklyReport(params: {
  focusSessions: FocusSession[];
  problems: LeetCodeProblem[];
  waterEntries: WaterEntry[];
  sleepEntries: SleepEntry[];
  workoutEntries: WorkoutEntry[];
  bookChapters: any[]; // Array of completed chapters
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
    sleepEntries,
    workoutEntries: rawWorkoutEntries,
    bookChapters,
    stepsData,
    healthGoals,
    last7Days,
    prev7Days,
    meals,
    trackers
  } = params;

  // 1. Deduplicate LeetCode Problems (completed + active only once)
  const seenProblems = new Set<string>();
  const problems = rawProblems.filter(p => {
    const slug = p.link?.trim().toLowerCase() || '';
    const key = slug.includes('/problems/') 
      ? slug.split('/problems/')[1]?.split('/')[0] || p.name.trim().toLowerCase()
      : p.name.trim().toLowerCase();
    const uniqueKey = `${p.completed ? 'completed' : 'todo'}_${key}`;
    if (seenProblems.has(uniqueKey)) return false;
    seenProblems.add(uniqueKey);
    return true;
  });

  // 2. Deduplicate Focus Sessions (by start time and duration to prevent sync overlaps)
  const seenSessions = new Set<string>();
  const focusSessions = rawFocusSessions.filter(s => {
    if (!s.startTime) return false;
    const key = `${s.startTime}_${s.duration}`;
    if (seenSessions.has(key)) return false;
    seenSessions.add(key);
    return true;
  });

  // 3. Deduplicate Workouts (by date, start_time, name, and duration to eliminate Fit sync repeats)
  const seenWorkouts = new Set<string>();
  const workoutEntries = rawWorkoutEntries.filter(w => {
    const key = `${w.date}_${w.startTime || '08:30'}_${w.name.trim().toLowerCase()}_${w.durationMinutes}`;
    if (seenWorkouts.has(key)) return false;
    seenWorkouts.add(key);
    return true;
  });

  // Health and Calorie aggregates
  let totalCaloriesTaken = 0;
  meals.forEach(m => {
    const dStr = normalizeToLocalDateString(m.date);
    if (dStr && last7Days.includes(dStr)) {
      totalCaloriesTaken += m.calories;
    }
  });

  let totalCaloriesBurnt = 0;
  workoutEntries.forEach(w => {
    const dStr = normalizeToLocalDateString(w.date);
    if (dStr && last7Days.includes(dStr)) {
      totalCaloriesBurnt += w.caloriesBurned || 0;
    }
  });

  // Custom Trackers Summary
  const trackerSummaries: any[] = [];
  trackers.forEach(t => {
    let completedCount = 0;
    let totalLogged = 0;
    let sumValue = 0;
    let valueCount = 0;

    t.items.forEach(item => {
      const dStr = normalizeToLocalDateString(item.dateCompleted);
      if (dStr && last7Days.includes(dStr)) {
        totalLogged++;
        if (item.status === 'completed') {
          completedCount++;
        }
        if (item.value !== undefined && item.value !== null) {
          sumValue += item.value;
          valueCount++;
        }
      }
    });

    if (totalLogged > 0) {
      trackerSummaries.push({
        trackerId: t.id,
        title: t.title,
        type: t.type,
        unit: t.unit,
        target: t.target,
        completedCount,
        totalLogged,
        sumValue: valueCount > 0 ? sumValue : undefined,
        avgValue: valueCount > 0 ? sumValue / valueCount : undefined
      });
    }
  });

  // 1. Resolve goals from database settings
  const waterGoalMl = healthGoals.find(g => g.type === 'water')?.targetValue ?? 3000;
  const sleepGoalHours = healthGoals.find(g => g.type === 'sleep_hours')?.targetValue ?? 7.5;
  const sleepGoalMin = sleepGoalHours * 60;
  const codingGoalPoints = 6; // Target points (Easy=1, Med=2, Hard=4)
  const focusGoalMin = 300; // 5 hours weekly

  // 2. High-speed Indexed Maps (Canonical Local Dates)
  const sessionsMap = new Map<string, FocusSession[]>();
  focusSessions.forEach(s => {
    const dStr = normalizeToLocalDateString(s.date || s.startTime);
    if (dStr) {
      if (!sessionsMap.has(dStr)) sessionsMap.set(dStr, []);
      sessionsMap.get(dStr)!.push(s);
    }
  });

  const waterMap = new Map<string, WaterEntry[]>();
  waterEntries.forEach(w => {
    const dStr = normalizeToLocalDateString(w.date);
    if (dStr) {
      if (!waterMap.has(dStr)) waterMap.set(dStr, []);
      waterMap.get(dStr)!.push(w);
    }
  });

  const sleepMap = new Map<string, SleepEntry>();
  sleepEntries.forEach(s => {
    const dStr = normalizeToLocalDateString(s.date);
    if (dStr) {
      sleepMap.set(dStr, s);
    }
  });

  const workoutsMap = new Map<string, WorkoutEntry[]>();
  workoutEntries.forEach(w => {
    const dStr = normalizeToLocalDateString(w.date);
    if (dStr) {
      if (!workoutsMap.has(dStr)) workoutsMap.set(dStr, []);
      workoutsMap.get(dStr)!.push(w);
    }
  });

  const problemsMap = new Map<string, LeetCodeProblem[]>();
  problems.forEach(p => {
    const dStr = normalizeToLocalDateString(p.date);
    if (dStr) {
      if (!problemsMap.has(dStr)) problemsMap.set(dStr, []);
      problemsMap.get(dStr)!.push(p);
    }
  });

  const indexed: IndexedReportData = { sessionsMap, waterMap, sleepMap, workoutsMap, problemsMap };

  // 3. Aggregate current week statistics
  const currentWeekStats = {
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
    waterDaysHit: 0,
    sleepDaysHit: 0,
    problemsDaysHit: 0,
    readingDaysHit: 0,
    consistencyDays: 0,
  };

  const currentProblemsList: LeetCodeProblem[] = [];

  last7Days.forEach(date => {
    // Focus sessions details
    const daySessions = indexed.sessionsMap.get(date) || [];
    const { completedCount, totalFocusMin } = daySessions.reduce(
      (acc, s) => {
        if (s.completed) {
          acc.completedCount++;
          acc.totalFocusMin += s.actualDuration || s.duration;
        }
        return acc;
      },
      { completedCount: 0, totalFocusMin: 0 }
    );
    currentWeekStats.totalSessions += daySessions.length;
    currentWeekStats.completedSessions += completedCount;
    currentWeekStats.focusMinutes += totalFocusMin;
    if (completedCount > 0) currentWeekStats.consistencyDays++;

    // Problems Solved details
    const dayProblems = indexed.problemsMap.get(date) || [];
    const solvedCount = dayProblems.reduce((acc, p) => {
      if (p.completed) {
        acc++;
        currentProblemsList.push(p);
      }
      return acc;
    }, 0);
    currentWeekStats.problemsSolved += solvedCount;
    if (solvedCount > 0) currentWeekStats.problemsDaysHit++;

    // Water Intake details
    const dayWater = indexed.waterMap.get(date) || [];
    const waterTotal = dayWater.reduce((acc, w) => acc + w.amount, 0);
    currentWeekStats.waterMl += waterTotal;
    if (waterTotal >= waterGoalMl) currentWeekStats.waterDaysHit++;

    // Sleep details
    const daySleep = indexed.sleepMap.get(date);
    if (daySleep) {
      currentWeekStats.sleepMinutes += daySleep.totalMinutes;
      currentWeekStats.sleepDaysWithData++;
      if (daySleep.totalMinutes >= sleepGoalMin) currentWeekStats.sleepDaysHit++;
    }

    // Book chapters completed
    const dayChapters = bookChapters.filter(
      c => c.completed && normalizeToLocalDateString(c.dateCompleted) === date
    ).length;
    currentWeekStats.chaptersRead += dayChapters;
    if (dayChapters > 0) currentWeekStats.readingDaysHit++;

    // Workouts
    currentWeekStats.workoutsCount += (indexed.workoutsMap.get(date) || []).length;
    
    // Steps
    currentWeekStats.steps += stepsData[date] || 0;
  });

  // 4. Aggregate previous week statistics
  const prevWeekStats = {
    focusMinutes: 0,
    completedSessions: 0,
    problemsSolved: 0,
    chaptersRead: 0,
    waterMl: 0,
    sleepMinutes: 0,
    sleepDaysWithData: 0,
    workoutsCount: 0,
  };

  prev7Days.forEach(date => {
    const daySessions = indexed.sessionsMap.get(date) || [];
    const { completedCount, totalFocusMin } = daySessions.reduce(
      (acc, s) => {
        if (s.completed) {
          acc.completedCount++;
          acc.totalFocusMin += s.actualDuration || s.duration;
        }
        return acc;
      },
      { completedCount: 0, totalFocusMin: 0 }
    );
    prevWeekStats.completedSessions += completedCount;
    prevWeekStats.focusMinutes += totalFocusMin;

    const dayProblems = indexed.problemsMap.get(date) || [];
    prevWeekStats.problemsSolved += dayProblems.reduce((acc, p) => acc + (p.completed ? 1 : 0), 0);

    const dayChapters = bookChapters.filter(
      c => c.completed && normalizeToLocalDateString(c.dateCompleted) === date
    ).length;
    prevWeekStats.chaptersRead += dayChapters;

    const dayWater = indexed.waterMap.get(date) || [];
    prevWeekStats.waterMl += dayWater.reduce((acc, w) => acc + w.amount, 0);

    const daySleep = indexed.sleepMap.get(date);
    if (daySleep) {
      prevWeekStats.sleepMinutes += daySleep.totalMinutes;
      prevWeekStats.sleepDaysWithData++;
    }

    prevWeekStats.workoutsCount += (indexed.workoutsMap.get(date) || []).length;
  });

  // Safe percentage calculator
  const getChangePct = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const focusChange = getChangePct(currentWeekStats.focusMinutes, prevWeekStats.focusMinutes);
  const codingChange = getChangePct(currentWeekStats.problemsSolved, prevWeekStats.problemsSolved);
  const readingChange = getChangePct(currentWeekStats.chaptersRead, prevWeekStats.chaptersRead);
  const waterChange = getChangePct(currentWeekStats.waterMl, prevWeekStats.waterMl);
  
  const currSleepAvg = currentWeekStats.sleepDaysWithData > 0 ? currentWeekStats.sleepMinutes / currentWeekStats.sleepDaysWithData : 0;
  const prevSleepAvg = prevWeekStats.sleepDaysWithData > 0 ? prevWeekStats.sleepMinutes / prevWeekStats.sleepDaysWithData : 0;
  const sleepChange = getChangePct(currSleepAvg, prevSleepAvg);

  // 5. Dynamic Timezone-Safe Best/Worst Days calculation
  let maxFocusMin = 0;
  let bestFocusDate = '';
  let maxProblems = 0;
  let bestProblemsDate = '';
  let minSleepMin = 99999;
  let worstSleepDate = '';

  last7Days.forEach(date => {
    const daySessions = indexed.sessionsMap.get(date) || [];
    const dayFocusMin = daySessions.reduce((acc, s) => acc + (s.completed ? (s.actualDuration || s.duration) : 0), 0);
    if (dayFocusMin > maxFocusMin) {
      maxFocusMin = dayFocusMin;
      bestFocusDate = date;
    }

    const dayProblems = indexed.problemsMap.get(date) || [];
    const daySolved = dayProblems.reduce((acc, p) => acc + (p.completed ? 1 : 0), 0);
    if (daySolved > maxProblems) {
      maxProblems = daySolved;
      bestProblemsDate = date;
    }

    const daySleep = indexed.sleepMap.get(date);
    if (daySleep && daySleep.totalMinutes > 0 && daySleep.totalMinutes < minSleepMin) {
      minSleepMin = daySleep.totalMinutes;
      worstSleepDate = date;
    }
  });

  const formatDayName = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return format(new Date(dateStr + 'T00:00:00'), 'EEEE');
  };

  const bestFocusDay = bestFocusDate ? formatDayName(bestFocusDate) : 'N/A';
  const bestCodingDay = bestProblemsDate ? formatDayName(bestProblemsDate) : 'N/A';
  const weakestSleepDay = worstSleepDate ? formatDayName(worstSleepDate) : 'N/A';

  // 6. Focus reflections parser (type guards protect against text/JSON anomalies)
  let problemsSolvedReflections = 0;
  let learningMinutesReflections = 0;
  let pagesReadReflections = 0;
  let featuresShippedReflections = 0;

  last7Days.forEach(date => {
    const daySessions = indexed.sessionsMap.get(date) || [];
    daySessions.forEach(s => {
      if (s.completed && s.reflection) {
        try {
          const parsed = JSON.parse(s.reflection);
          if (parsed && typeof parsed === 'object') {
            const q = parsed.quantities;
            if (q && typeof q === 'object') {
              problemsSolvedReflections += typeof q.problemsSolved === 'number' ? q.problemsSolved : 0;
              learningMinutesReflections += typeof q.minutesOfLearning === 'number' ? q.minutesOfLearning : 0;
              pagesReadReflections += typeof q.pagesRead === 'number' ? q.pagesRead : 0;
              featuresShippedReflections += typeof q.featuresShipped === 'number' ? q.featuresShipped : 0;
            }
          }
        } catch {
          // Safe fallback for plain text reflections
        }
      }
    });
  });

  // 7. Calculate composite focus score (weighted difficulty + anti-cheat completes)
  const focusQualityScore = calculateFocusQualityScore({
    completedSessionsCount: currentWeekStats.completedSessions,
    totalSessionsCount: currentWeekStats.totalSessions,
    focusMinutes: currentWeekStats.focusMinutes,
    problemsSolvedList: currentProblemsList,
    chaptersRead: currentWeekStats.chaptersRead,
    consistencyDays: currentWeekStats.consistencyDays,
    averageSleepMinutes: currSleepAvg,
    sleepGoalMinutes: sleepGoalMin,
    focusGoalMinutes: focusGoalMin,
    codingGoalPoints
  });

  // 8. Generate mathematically derived correlation trends
  const correlationInsights: string[] = [];
  const dailyData = last7Days.map(date => {
    const daySessions = indexed.sessionsMap.get(date) || [];
    const focusMin = daySessions.reduce((acc, s) => acc + (s.completed ? (s.actualDuration || s.duration) : 0), 0);
    
    const daySleep = indexed.sleepMap.get(date);
    const sleepMin = daySleep ? daySleep.totalMinutes : 0;
    
    const dayWater = indexed.waterMap.get(date) || [];
    const waterTotal = dayWater.reduce((acc, w) => acc + w.amount, 0);

    const dayWorkout = (indexed.workoutsMap.get(date) || []).length > 0;
    const problemsSolved = (indexed.problemsMap.get(date) || []).reduce((acc, p) => acc + (p.completed ? 1 : 0), 0);

    const dayChapters = bookChapters.filter(
      c => c.completed && normalizeToLocalDateString(c.dateCompleted) === date
    ).length;

    return { focusMin, sleepMin, waterTotal, dayWorkout, problemsSolved, dayChapters };
  });

  const sleepFocusData = dailyData.filter(d => d.sleepMin > 0 && d.focusMin > 0);
  if (sleepFocusData.length >= 4) {
    const sleeps = sleepFocusData.map(d => d.sleepMin);
    const focuses = sleepFocusData.map(d => d.focusMin);
    const rVal = calculatePearsonCorrelation(sleeps, focuses);

    if (rVal > 0.35) {
      correlationInsights.push(`Positive focus correlation (r = ${rVal.toFixed(2)}): Focus durations increased on days following higher rest.`);
    } else if (rVal < -0.35) {
      correlationInsights.push(`Negative focus correlation (r = ${rVal.toFixed(2)}): Focus time declined with longer sleep, indicating possible sleep inertia.`);
    } else {
      correlationInsights.push("No strong statistical correlation was observed between sleep duration and focus blocks.");
    }
  } else {
    correlationInsights.push("Log sleep and focus sessions regularly (min 4 days) to generate sleep-to-focus correlation statistics.");
  }

  // Active workout correlation with problems solved or focus duration
  const activeDays = dailyData.filter(d => d.dayWorkout);
  const restingDays = dailyData.filter(d => !d.dayWorkout);
  if (activeDays.length >= 2 && restingDays.length >= 2) {
    const avgActiveCoding = activeDays.reduce((a, d) => a + d.problemsSolved, 0) / activeDays.length;
    const avgRestingCoding = restingDays.reduce((a, d) => a + d.problemsSolved, 0) / restingDays.length;
    if (avgActiveCoding > avgRestingCoding + 0.2) {
      const pctIncrease = Math.round(((avgActiveCoding - avgRestingCoding) / (avgRestingCoding || 1)) * 100);
      correlationInsights.push(`Fitness Boost: Coding solves were ${pctIncrease}% higher on active workout days.`);
    } else if (avgActiveCoding < avgRestingCoding - 0.2) {
      correlationInsights.push("Coding problem solving remained high on rest days, optimal for mental recovery.");
    } else {
      correlationInsights.push("Coding solves remained balanced across both active and rest days.");
    }
  } else {
    correlationInsights.push("Record fitness sessions to evaluate how physical activity impacts cognitive focus output.");
  }

  // 9. Structured Apple/Notion-Grade Wins, Concerns, and Action Plans
  const wins: string[] = [];
  const risks: string[] = [];
  const recommendations: string[] = [];
  const actionPlan: string[] = [];

  const avgWater = Math.round(currentWeekStats.waterMl / 7);
  const avgSleep = currentWeekStats.sleepDaysWithData > 0 ? Math.round(currentWeekStats.sleepMinutes / currentWeekStats.sleepDaysWithData) : sleepGoalMin;

  const completionRate = currentWeekStats.totalSessions > 0
    ? Math.round((currentWeekStats.completedSessions / currentWeekStats.totalSessions) * 100)
    : 100;

  // Wins
  if (completionRate >= 80 && currentWeekStats.totalSessions > 0) wins.push("Strong consistency: maintained a focus session completion rate above 80%.");
  if (currentWeekStats.problemsSolved >= 4) wins.push(`Problem-solving activity: successfully resolved ${currentWeekStats.problemsSolved} coding exercises.`);
  if (currentWeekStats.chaptersRead >= 3) wins.push(`Excellent reading habits: completed ${currentWeekStats.chaptersRead} book chapters this week.`);
  if (currentWeekStats.focusMinutes >= focusGoalMin) wins.push(`Focused for over ${Math.round(currentWeekStats.focusMinutes / 60)} hours this week.`);
  if (avgWater >= waterGoalMl) wins.push("Consistent hydration: daily water targets were fully achieved.");

  // Concerns
  if (avgSleep < sleepGoalMin && currentWeekStats.sleepDaysWithData > 0) risks.push(`Average daily sleep fell below your ${(sleepGoalMin / 60).toFixed(1)}h rest target.`);
  if (avgWater < waterGoalMl * 0.9) risks.push(`Average hydration fell below your ${(waterGoalMl / 1000).toFixed(1)}L target.`);
  if (currentWeekStats.chaptersRead === 0) risks.push("Zero reading activity: no book chapters completed this week.");
  if (completionRate < 70 && currentWeekStats.totalSessions > 0) risks.push("Focus routine interrupted by multiple early session abandonments.");
  if (currentWeekStats.totalSessions < 3) risks.push("Weekly logged focus sessions are below your target frequency.");

  // Recommendations & Actions
  if (avgWater < waterGoalMl) {
    recommendations.push(`Increase daily hydration to meet your ${(waterGoalMl / 1000).toFixed(1)}L target.`);
    actionPlan.push(`Log water earlier during morning cycles to hit ${(waterGoalMl / 1000).toFixed(1)}L daily.`);
  }
  if (avgSleep < sleepGoalMin + 30) {
    recommendations.push("Prioritize sleep hygiene to support recovery.");
    actionPlan.push(`Wind down 45 minutes before sleep and aim for ${(sleepGoalMin / 60).toFixed(1)}h rest.`);
  }
  if (currentWeekStats.chaptersRead < 3) {
    recommendations.push("Dedicate 15 minutes of quiet reading to rebuild your routine.");
    actionPlan.push("Complete at least 3 chapters in your current book next week.");
  }
  if (completionRate < 80) {
    recommendations.push("Break work into smaller intervals to manage distraction triggers.");
    actionPlan.push("Use 25-minute focus intervals to rebuild session completion habits.");
  }

  if (wins.length === 0) wins.push("Kept up study routine and habit commitments.");
  if (risks.length === 0) risks.push("No negative sleep drops or routine interruptions detected.");
  if (recommendations.length === 0) recommendations.push("Maintain current focus schedules and balanced sleep habits.");
  if (actionPlan.length === 0) actionPlan.push("Continue with your active habit streaks next week.");

  const focusChartData = dailyData.map(d => d.focusMin);
  const codingChartData = dailyData.map(d => d.problemsSolved);
  const waterChartData = dailyData.map(d => d.waterTotal);
  const sleepChartData = dailyData.map(d => d.sleepMin);
  const readingChartData = dailyData.map(d => d.dayChapters);

  return {
    focusMinutes: currentWeekStats.focusMinutes,
    completedSessions: currentWeekStats.completedSessions,
    completionRate,
    focusQualityScore,
    problemsSolved: currentWeekStats.problemsSolved,
    chaptersRead: currentWeekStats.chaptersRead,
    waterAverageL: (avgWater / 1000).toFixed(1),
    sleepAverageH: (avgSleep / 60).toFixed(1),
    workoutCount: currentWeekStats.workoutsCount,
    stepsAverage: Math.round(currentWeekStats.steps / 7),
    focusChange,
    codingChange,
    readingChange,
    waterChange,
    sleepChange,
    bestFocusDay,
    bestCodingDay,
    weakestSleepDay,
    problemsSolvedReflections,
    learningMinutesReflections,
    pagesReadReflections,
    featuresShippedReflections,
    correlationInsights,
    wins,
    risks,
    recommendations,
    actionPlan,
    waterDaysHit: currentWeekStats.waterDaysHit,
    sleepDaysHit: currentWeekStats.sleepDaysHit,
    problemsDaysHit: currentWeekStats.problemsDaysHit,
    readingDaysHit: currentWeekStats.readingDaysHit,
    focusChartData,
    codingChartData,
    waterChartData,
    sleepChartData,
    readingChartData,
    sleepDaysWithData: currentWeekStats.sleepDaysWithData,
    totalCaloriesTaken,
    totalCaloriesBurnt,
    totalWaterIntakeMl: currentWeekStats.waterMl,
    trackerSummaries
  };
}
