import React, { useMemo, useState, Suspense, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import {
  format, subDays, startOfWeek, addDays, parseISO,
} from 'date-fns';
import {
  useWater, useMeals, useWorkouts, useSleepEntries, useHealthGoals,
  useHealthRestrictions, useUpdateRestriction, useAddRestriction, useUpdateGoal, useAddGoal,
} from '../hooks/useHealthQuery';
import { useBook } from '../hooks/useBookQuery';
import { useProblems } from '../hooks/useLeetCodeQuery';
import { useFocusSessions } from '../hooks/useFocusQuery';
import { useDailyActivity } from '../hooks/useActivityQuery';
import {
  TrendingUp, Target, Zap, BookOpen, Clock, Activity,
  Download, Heart, Droplets, Dumbbell, Moon,
} from 'lucide-react';
import { getProductivityScore } from '../lib/utils';

import WeeklyHeatmapMatrix from '../components/analytics/WeeklyHeatmapMatrix';
import WeeklyPerformance from '../components/analytics/WeeklyPerformance';
import ActivityHeatmap from '../components/analytics/ActivityHeatmap';
import CognitiveInsights from '../components/analytics/CognitiveInsights';
import ExecutiveKPIs from '../components/analytics/ExecutiveKPIs';
import GoalTracking from '../components/analytics/GoalTracking';
import DeferredOnVisible from '../components/DeferredOnVisible';

const DrillDownModal = React.lazy(() => import('../components/DrillDownModal'));
const ReportModal    = React.lazy(() => import('../components/ReportModal'));
const TrendAnalytics = React.lazy(() => import('../components/analytics/TrendAnalytics'));
const FocusIntelligence = React.lazy(() => import('../components/analytics/FocusIntelligence'));
const DeepWorkQuality = React.lazy(() => import('../components/analytics/DeepWorkQuality'));
const HourlyPerformance = React.lazy(() => import('../components/analytics/HourlyPerformance'));
const PerformanceRadar = React.lazy(() => import('../components/analytics/PerformanceRadar'));
const AnalyticsHealthCharts = React.lazy(() => import('../components/analytics/AnalyticsHealthCharts'));

// ── Animation variants ──────────────────────────────────────────────────────
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item    = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

// ── Main Component ───────────────────────────────────────────────────────────
export default function Analytics() {
  const localStore = useAppStore();
  const focusStreak = useAppStore(s => s.focusStreak);

  const { data: book = localStore.book } = useBook();
  const { data: problems = [] } = useProblems();
  const { data: focusSessions = [] } = useFocusSessions();
  const { data: dailyActivity = [] } = useDailyActivity();

  const [range, setRange]           = useState<7 | 30 | 90>(30);
  const [showReport, setShowReport] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeTab, setActiveTab]   = useState<'productivity' | 'biometrics'>('productivity');

  // ── Health queries ──────────────────────────────────────────────────────
  const { data: waterLogs   = [] } = useWater();
  const { data: meals       = [] } = useMeals();
  const { data: workouts    = [] } = useWorkouts();
  const { data: sleepLogs   = [] } = useSleepEntries();
  const { data: healthGoals = [] } = useHealthGoals();
  const { data: restrictions = [] } = useHealthRestrictions();

  const updateGoalMut = useUpdateGoal();
  const addGoalMut    = useAddGoal();
  const updateRestMut = useUpdateRestriction();
  const addRestMut    = useAddRestriction();

  // ── Goal / restriction helpers ──────────────────────────────────────────
  const activeCalorieGoalObj = useMemo(() => healthGoals.find(g => g.type === 'calories'), [healthGoals]);
  const activeCalorieGoal    = activeCalorieGoalObj?.targetValue ?? 2100;

  const activeCalorieCapObj = useMemo(() => restrictions.find(r => r.type === 'calorie_cap'), [restrictions]);

  const activeWaterGoalObj = useMemo(() => healthGoals.find(g => g.type === 'water'), [healthGoals]);
  const activeWaterGoal    = activeWaterGoalObj?.targetValue ?? 3000;

  const handleCalorieGoalChange = useCallback((v: number) => {
    activeCalorieGoalObj
      ? updateGoalMut.mutate({ id: activeCalorieGoalObj.id, updates: { targetValue: v } })
      : addGoalMut.mutate({ label: 'Daily Calories', type: 'calories', targetValue: v, unit: 'kcal' });
  }, [activeCalorieGoalObj, updateGoalMut, addGoalMut]);

  const handleCalorieCapChange = useCallback((v: number) => {
    activeCalorieCapObj
      ? updateRestMut.mutate({ id: activeCalorieCapObj.id, updates: { limitValue: v } })
      : addRestMut.mutate({ label: 'Calorie Cap', type: 'calorie_cap', limitValue: v, unit: 'kcal', enabled: true });
  }, [activeCalorieCapObj, updateRestMut, addRestMut]);

  const handleWaterGoalChange = useCallback((v: number) => {
    activeWaterGoalObj
      ? updateGoalMut.mutate({ id: activeWaterGoalObj.id, updates: { targetValue: v } })
      : addGoalMut.mutate({ label: 'Daily Water', type: 'water', targetValue: v, unit: 'ml' });
  }, [activeWaterGoalObj, updateGoalMut, addGoalMut]);

  // ── Robust derived daily activity map ──────────────────────────────────
  const activityMap = useMemo(() => {
    const map: Record<string, { chaptersRead: number; problemsSolved: number; focusMinutes: number; productivityScore: number }> = {};

    // 1. Initialize map with existing dailyActivity records from Supabase
    dailyActivity.forEach(a => {
      map[a.date] = {
        chaptersRead: a.chaptersRead,
        problemsSolved: a.problemsSolved,
        focusMinutes: a.focusMinutes,
        productivityScore: a.productivityScore,
      };
    });

    // 2. Derive problems solved from the real problems database query
    problems.forEach(p => {
      if (p.completed && p.date) {
        const dateStr = p.date;
        if (!map[dateStr]) {
          map[dateStr] = { chaptersRead: 0, problemsSolved: 0, focusMinutes: 0, productivityScore: 0 };
        }
        map[dateStr].problemsSolved = Math.max(map[dateStr].problemsSolved, problems.filter(pr => pr.completed && pr.date === dateStr).length);
      }
    });

    // 3. Derive focus minutes from the real focus sessions database query
    focusSessions.forEach(s => {
      if (s.completed && s.date) {
        const dateStr = s.date;
        if (!map[dateStr]) {
          map[dateStr] = { chaptersRead: 0, problemsSolved: 0, focusMinutes: 0, productivityScore: 0 };
        }
        const totalMin = focusSessions.filter(fs => fs.completed && fs.date === dateStr).reduce((acc, fs) => acc + (fs.actualDuration || fs.duration), 0);
        map[dateStr].focusMinutes = Math.max(map[dateStr].focusMinutes, totalMin);
      }
    });

    // 4. Derive book chapters read from the real chapters array
    if (book && book.chapters) {
      book.chapters.forEach((c: any) => {
        if (c.completed && c.dateCompleted) {
          const dateStr = c.dateCompleted;
          if (!map[dateStr]) {
            map[dateStr] = { chaptersRead: 0, problemsSolved: 0, focusMinutes: 0, productivityScore: 0 };
          }
          const totalChapters = book.chapters.filter(ch => ch.completed && ch.dateCompleted === dateStr).length;
          map[dateStr].chaptersRead = Math.max(map[dateStr].chaptersRead, totalChapters);
        }
      });
    }

    // Ensure no undercounting from original daily_activity rows
    dailyActivity.forEach(a => {
      const entry = map[a.date];
      if (entry) {
        entry.chaptersRead = Math.max(entry.chaptersRead, a.chaptersRead);
        entry.problemsSolved = Math.max(entry.problemsSolved, a.problemsSolved);
        entry.focusMinutes = Math.max(entry.focusMinutes, a.focusMinutes);
        entry.productivityScore = getProductivityScore(entry.chaptersRead, entry.problemsSolved, entry.focusMinutes);
      }
    });

    // Populate productivityScore for all derived entries
    Object.keys(map).forEach(key => {
      const entry = map[key];
      entry.productivityScore = getProductivityScore(entry.chaptersRead, entry.problemsSolved, entry.focusMinutes);
    });

    return map;
  }, [dailyActivity, problems, focusSessions, book]);

  // Robust daily activity array derived from the dynamic activityMap
  const robustDailyActivity = useMemo(() => {
    return Object.keys(activityMap).map(dateStr => ({
      date: dateStr,
      chaptersRead: activityMap[dateStr].chaptersRead,
      problemsSolved: activityMap[dateStr].problemsSolved,
      focusMinutes: activityMap[dateStr].focusMinutes,
      productivityScore: activityMap[dateStr].productivityScore,
    }));
  }, [activityMap]);

  const sessionsByDate = useMemo(() => {
    const map: Record<string, typeof focusSessions> = {};
    focusSessions.forEach(s => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [focusSessions]);

  // ── Biometric data grouped by date ──────────────────────────────────────
  const biometricDataByDate = useMemo(() => {
    const data: Record<string, {
      water: number; calories: number; protein: number;
      workoutMin: number; workoutCal: number; sleepMin: number;
    }> = {};

    const ensure = (d: string) => {
      if (!data[d]) data[d] = { water: 0, calories: 0, protein: 0, workoutMin: 0, workoutCal: 0, sleepMin: 0 };
    };

    waterLogs.forEach(w => { ensure(w.date); data[w.date].water += w.amount; });
    meals.forEach(m => {
      ensure(m.date);
      data[m.date].calories += m.calories ?? 0;
      data[m.date].protein  += m.protein  ?? 0;
    });
    workouts.forEach(wk => {
      ensure(wk.date);
      data[wk.date].workoutMin += wk.durationMinutes  ?? 0;
      data[wk.date].workoutCal += wk.caloriesBurned   ?? 0;
    });
    sleepLogs.forEach(s => { ensure(s.date); data[s.date].sleepMin += s.totalMinutes ?? 0; });

    return data;
  }, [waterLogs, meals, workouts, sleepLogs]);

  // ── Chart data over selected range ──────────────────────────────────────
  const activityData = useMemo(() => (
    Array.from({ length: range }, (_, i) => {
      const d   = subDays(new Date(), (range - 1) - i);
      const key = format(d, 'yyyy-MM-dd');
      const act = activityMap[key];
      const daySessions  = sessionsByDate[key] ?? [];
      const completedCnt = daySessions.filter(s => s.completed).length;

      return {
        date:       key,
        day:        format(d, 'MMM d'),
        focus:      act?.focusMinutes    ?? 0,
        problems:   act?.problemsSolved  ?? 0,
        chapters:   act?.chaptersRead    ?? 0,
        efficiency: daySessions.length > 0 ? Math.round((completedCnt / daySessions.length) * 100) : 0,
        problemsVal: (act?.problemsSolved ?? 0) * 15,
        chaptersVal: (act?.chaptersRead   ?? 0) * 20,
      };
    })
  ), [activityMap, sessionsByDate, range]);

  const biometricActivityData = useMemo(() => (
    Array.from({ length: range }, (_, i) => {
      const d      = subDays(new Date(), (range - 1) - i);
      const key    = format(d, 'yyyy-MM-dd');
      const health = biometricDataByDate[key] ?? { water: 0, calories: 0, protein: 0, workoutMin: 0, workoutCal: 0, sleepMin: 0 };
      return {
        date:       key,
        day:        format(d, 'MMM d'),
        water:      health.water,
        calories:   health.calories,
        protein:    health.protein,
        workoutMin: health.workoutMin,
        workoutCal: health.workoutCal,
        sleepHrs:   Math.round((health.sleepMin / 60) * 10) / 10,
      };
    })
  ), [biometricDataByDate, range]);

  // ── Aggregate biometric stats ────────────────────────────────────────────
  const biometricStats = useMemo(() => {
    let totalWater = 0, totalCalories = 0, totalWorkoutMin = 0, totalSleepMin = 0;
    biometricActivityData.forEach(d => {
      totalWater      += d.water;
      totalCalories   += d.calories;
      totalWorkoutMin += d.workoutMin;
      totalSleepMin   += d.sleepHrs * 60;
    });
    const div = Math.max(1, range);
    const inRangeWorkouts = workouts.filter(w => {
      try {
        if (w.date.length === 10 && w.date.includes('-')) {
          const [year, month, day] = w.date.split('-').map(Number);
          const d = new Date(year, month - 1, day);
          const startRange = subDays(new Date(), range);
          startRange.setHours(0, 0, 0, 0);
          return d >= startRange;
        }
        return false;
      } catch {
        return false;
      }
    });

    return {
      avgWaterL:    (totalWater      / div / 1000).toFixed(2),
      avgCalories:  Math.round(totalCalories   / div),
      avgWorkoutMin: Math.round(totalWorkoutMin / div),
      avgSleepHrs:  (totalSleepMin  / div / 60).toFixed(1),
      totalWorkouts: inRangeWorkouts.length,
    };
  }, [biometricActivityData, workouts, range]);

  // ── Metabolic flow scores (last 7 days) ─────────────────────────────────
  const last7DaysScores = useMemo(() => (
    Array.from({ length: 7 }, (_, i) => {
      const d      = subDays(new Date(), 6 - i);
      const key    = format(d, 'yyyy-MM-dd');
      const health = biometricDataByDate[key] ?? { water: 0, calories: 0, protein: 0, workoutMin: 0, workoutCal: 0, sleepMin: 0 };

      const calScore     = Math.min(health.calories   / Math.max(activeCalorieGoal, 1), 1) * 25;
      const waterScore   = Math.min(health.water      / Math.max(activeWaterGoal,   1), 1) * 25;
      const sleepScore   = Math.min(health.sleepMin   / (8 * 60),                      1) * 25;
      const workoutScore = health.workoutMin >= 30 ? 25 : (health.workoutMin / 30) * 25;

      return {
        dayLabel: format(d, 'EEE'),
        score:    Math.max(5, Math.min(100, Math.round(calScore + waterScore + sleepScore + workoutScore))),
      };
    })
  ), [biometricDataByDate, activeCalorieGoal, activeWaterGoal]);

  // ── Cognitive insights ───────────────────────────────────────────────────
  const cognitiveInsights = useMemo(() => {
    let focusMinHighSleep = 0, countHighSleep = 0;
    let focusMinLowSleep  = 0, countLowSleep  = 0;
    let completeWaterHigh = 0, totalWaterHigh = 0;
    let completeWaterLow  = 0, totalWaterLow  = 0;
    const hourCounts = Array.from<number>({ length: 24 }).fill(0);

    focusSessions.forEach(s => {
      const duration = s.actualDuration || s.duration;

      // Sleep correlation
      if (s.completed && s.date) {
        const sleepHrs = (sleepLogs.find(sl => sl.date === s.date)?.totalMinutes ?? 0) / 60;
        if (sleepHrs > 0) {
          if (sleepHrs >= 7) { focusMinHighSleep += duration; countHighSleep++; }
          else               { focusMinLowSleep  += duration; countLowSleep++;  }
        }
      }

      // Hydration correlation
      if (s.date) {
        const waterOnDay = waterLogs.filter(w => w.date === s.date).reduce((a, w) => a + w.amount, 0);
        if (waterOnDay > 0) {
          if (waterOnDay >= 1500) { if (s.completed) completeWaterHigh++; totalWaterHigh++; }
          else                    { if (s.completed) completeWaterLow++;  totalWaterLow++;  }
        }
      }

      // Peak hour
      if (s.completed && s.startTime) {
        try {
          const hr = new Date(s.startTime).getHours();
          if (!isNaN(hr)) {
            hourCounts[hr] += duration;
          }
        } catch { /* ignore */ }
      }
    });

    const hasSleepData = countHighSleep > 0 || countLowSleep > 0;
    const avgFocusHighSleep  = countHighSleep > 0 ? focusMinHighSleep / countHighSleep : 0;
    const avgFocusLowSleep   = countLowSleep  > 0 ? focusMinLowSleep  / countLowSleep  : 0;
    const sleepImprovement   = (hasSleepData && avgFocusLowSleep > 0)
      ? Math.round(((avgFocusHighSleep - avgFocusLowSleep) / avgFocusLowSleep) * 100) : 0;

    const hasWaterData = totalWaterHigh > 0 || totalWaterLow > 0;
    const completionHighWater = totalWaterHigh > 0 ? (completeWaterHigh / totalWaterHigh) * 100 : 0;
    const completionLowWater  = totalWaterLow  > 0 ? (completeWaterLow  / totalWaterLow)  * 100 : 0;
    const waterCorrelateDrop  = (hasWaterData) ? Math.max(0, Math.round(completionHighWater - completionLowWater)) : 0;

    let peakHour = 20, maxHourMin = 0;
    hourCounts.forEach((val, hr) => { if (val > maxHourMin) { maxHourMin = val; peakHour = hr; } });

    // Consecutive late nights
    let consecutiveLateNights = 0, currentStreak = 0;
    [...new Set(focusSessions.map(s => s.date).filter(Boolean))].sort().forEach(dateStr => {
      const hasLate = focusSessions.filter(s => s.date === dateStr).some(s => {
        if (!s.startTime) return false;
        try {
          const hr = new Date(s.startTime).getHours();
          return !isNaN(hr) && hr >= 0 && hr <= 3;
        } catch {
          return false;
        }
      });
      if (hasLate) { currentStreak++; consecutiveLateNights = Math.max(consecutiveLateNights, currentStreak); }
      else         { currentStreak = 0; }
    });

    return {
      sleepImprovement:     Math.max(0, sleepImprovement),
      waterCorrelateDrop:   Math.max(0, waterCorrelateDrop),
      peakHour,
      consecutiveLateNights,
      hasSleepData,
      hasWaterData,
    };
  }, [focusSessions, sleepLogs, waterLogs]);

  // ── Weekly review ────────────────────────────────────────────────────────
  const weeklyReview = useMemo(() => {
    const today         = new Date();
    const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
    const weekDays      = Array.from({ length: 7 }, (_, i) => format(addDays(startOfThisWeek, i), 'yyyy-MM-dd'));

    let sessionsCount = 0, solved = 0, chapters = 0, bestDay = 'N/A', maxScore = -1;
    let daysWithActivity = 0;

    weekDays.forEach(date => {
      const act  = activityMap[date];
      const sess = sessionsByDate[date] ?? [];
      const health = biometricDataByDate[date];

      const hasSession = sess.some(s => s.completed);
      const hasCoding  = act && (act.problemsSolved > 0);
      const hasReading = act && (act.chaptersRead > 0);
      const hasHealth  = health && (health.water > 0 || health.workoutMin > 0 || health.sleepMin > 0);

      if (act) {
        chapters += act.chaptersRead   ?? 0;
        solved   += act.problemsSolved ?? 0;
        const score = (act.focusMinutes / 25) + (act.problemsSolved * 2) + (act.chaptersRead * 1.5);
        if (score > maxScore) {
          maxScore = score;
          try {
            if (date.length === 10 && date.includes('-')) {
              const [year, month, day] = date.split('-').map(Number);
              bestDay = format(new Date(year, month - 1, day), 'EEEE');
            } else {
              bestDay = format(parseISO(date), 'EEEE');
            }
          } catch {
            bestDay = 'N/A';
          }
        }
      }
      sessionsCount += sess.filter(s => s.completed).length;

      if (hasSession || hasCoding || hasReading || hasHealth) {
        daysWithActivity++;
      }
    });

    const consistency = Math.round((daysWithActivity / 7) * 100);

    return { sessions: sessionsCount, problems: solved, chapters, bestDay, consistency };
  }, [activityMap, sessionsByDate, biometricDataByDate]);

  // ── Performance radar ────────────────────────────────────────────────────
  const radarData = useMemo(() => [
    { subject: 'Focus',       A: Math.min(100, (focusSessions.filter(s => s.completed).length   / Math.max(1, (range / 2))) * 100) },
    { subject: 'Coding',      A: Math.min(100, (problems.filter(p => p.completed).length        / Math.max(1, (range / 3))) * 100) },
    { subject: 'Learning',    A: Math.min(100, (book.chapters.filter(c => c.completed).length   / (book.chapters.length || 1)) * 100) },
    { subject: 'Consistency', A: Math.min(100, (focusStreak.currentStreak / 14) * 100) },
    { subject: 'Efficiency',  A: Math.round(  (focusSessions.filter(s => s.completed).length    / (focusSessions.length || 1)) * 100) },
  ], [focusSessions, problems, book, focusStreak, range]);

  // ── Focus stats for selected range ──────────────────────────────────────
  const stats = useMemo(() => {
    const now          = new Date();
    const currentStart = subDays(now, range);
    const prevStart    = subDays(currentStart, range);

    const filterRange = (sessions: typeof focusSessions, start: Date, end: Date) =>
      sessions.filter(s => {
        const timeStr = s.endTime || s.startTime;
        if (!timeStr) return false;
        try {
          const d = parseISO(timeStr);
          if (isNaN(d.getTime())) return false;
          return d >= start && d <= end;
        } catch {
          return false;
        }
      });

    const getStats = (sessions: typeof focusSessions) => {
      const completed = sessions.filter(s => s.completed);
      const totalMin  = completed.reduce((a, s) => a + (s.actualDuration || s.duration), 0);
      return { totalMin, count: completed.length, successRate: sessions.length > 0 ? (completed.length / sessions.length) * 100 : 0 };
    };

    const curr = getStats(filterRange(focusSessions, currentStart, now));
    const prev = getStats(filterRange(focusSessions, prevStart, currentStart));

    const getChange = (c: number, p: number) => p === 0 ? 0 : Math.round(((c - p) / p) * 100);

    return {
      totalMin:        curr.totalMin,
      totalMinChange:  getChange(curr.totalMin, prev.totalMin),
      successRate:     Math.round(curr.successRate),
      successRateChange: Math.round(curr.successRate - prev.successRate),
      count:           curr.count,
      countChange:     getChange(curr.count, prev.count),
      avgSession:      curr.count > 0 ? Math.round(curr.totalMin / curr.count) : 0,
    };
  }, [focusSessions, range]);

  // ── Heatmap data (12 weeks) ──────────────────────────────────────────────
  const heatmapData = useMemo(() => {
    const weeks: { date: string; value: number; label: string }[][] = [];
    let currentDay = startOfWeek(subDays(new Date(), 83), { weekStartsOn: 1 });
    for (let w = 0; w < 12; w++) {
      const weekDays = [];
      for (let d = 0; d < 7; d++) {
        const dateKey = format(currentDay, 'yyyy-MM-dd');
        const act     = activityMap[dateKey];
        weekDays.push({
          date:  dateKey,
          value: (act?.chaptersRead ?? 0) + (act?.problemsSolved ?? 0) + Math.floor((act?.focusMinutes ?? 0) / 25),
          label: format(currentDay, 'MMM d'),
        });
        currentDay = addDays(currentDay, 1);
      }
      weeks.push(weekDays);
    }
    return weeks;
  }, [activityMap]);

  // ── CSV Exporter ─────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    try {
      const headers = ['Date', 'Focus Minutes', 'Problems Solved', 'Chapters Read', 'Water Intake (ml)', 'Consumed Calories (kcal)', 'Sleep Hours'];
      const rows = biometricActivityData.map((b, i) => {
        const act = activityData[i] || { focus: 0, problems: 0, chapters: 0 };
        return [
          b.date,
          act.focus,
          act.problems,
          act.chapters,
          b.water,
          b.calories,
          b.sleepHrs
        ];
      });
      
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `productivity_report_${range}d_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.warn('CSV Export failed', e);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-6xl space-y-8 pb-24 relative">

      {/* ── Page Header ── */}
      <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] font-mono">Productivity Core Telemetry</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-3">
            Productivity{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
              Analytics
            </span>
          </h1>
          <p className="text-white/40 mt-1 text-sm font-medium font-sans">Computed productivity and health trends from your logged activity.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/5 p-1 rounded-2xl border border-white/10 flex backdrop-blur-xl">
            {([7, 30, 90] as const).map(v => (
              <button
                key={v}
                onClick={() => setRange(v)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                  range === v
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                {v}D
              </button>
            ))}
          </div>
          <button
            onClick={handleExportCSV}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 text-sm font-bold flex items-center gap-2 transition-all"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </motion.div>

      {/* ── Activity Heatmap Matrix ── */}
      <div className="relative z-10">
        <WeeklyHeatmapMatrix
          focusSessions={focusSessions}
          problems={problems}
          waterLogs={waterLogs}
          meals={meals}
          dailyActivity={robustDailyActivity}
          focusStreak={focusStreak}
        />
      </div>

      {/* ── Tab bar ── */}
      <motion.div variants={item} className="flex border-b border-white/5 pb-1 gap-2 relative z-10">
        {(['productivity', 'biometrics'] as const).map(tab => {
          const active = activeTab === tab;
          const activeColorClass = tab === 'productivity' ? 'text-violet-400 font-black' : 'text-rose-400 font-black';
          const underlineBgClass = tab === 'productivity' ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500' : 'bg-gradient-to-r from-rose-500 to-pink-500';
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-6 text-sm font-bold tracking-wider uppercase relative transition-all duration-300 ${
                active ? activeColorClass : 'text-white/40 hover:text-white/70'
              }`}
            >
              {tab === 'productivity' ? 'Productivity' : 'Health'}
              {active && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className={`absolute bottom-0 left-0 right-0 h-0.5 ${underlineBgClass}`}
                />
              )}
            </button>
          );
        })}
      </motion.div>

      {/* ═══════════════════════════════════════ PRODUCTIVITY TAB ══════════════════════════════════════ */}
      {activeTab === 'productivity' && (
        <div className="space-y-6 relative z-10">
          
          {/* Executive KPI Overview */}
          <motion.div variants={item}>
            <ExecutiveKPIs
              stats={stats}
              problems={problems}
              book={book}
              focusStreak={focusStreak}
              weeklyReview={weeklyReview}
            />
          </motion.div>

          {/* Time Series trends + Goal forecasts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Suspense fallback={<div className="glass-card h-[420px]" />}>
                <TrendAnalytics activityData={activityData} />
              </Suspense>
            </div>
            <GoalTracking
              stats={stats}
              problems={problems}
              book={book}
              biometricStats={biometricStats}
            />
          </div>

          {/* Focus Intelligence + Deep Work Quality */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DeferredOnVisible minHeight={360} fallback={<div className="glass-card h-[360px]" />}>
              <Suspense fallback={<div className="glass-card h-[360px]" />}>
                <FocusIntelligence focusSessions={focusSessions} />
              </Suspense>
            </DeferredOnVisible>
            <DeferredOnVisible minHeight={360} fallback={<div className="glass-card h-[360px]" />}>
              <Suspense fallback={<div className="glass-card h-[360px]" />}>
                <DeepWorkQuality focusSessions={focusSessions} />
              </Suspense>
            </DeferredOnVisible>
          </div>

          {/* Weekly summary reports + performance radar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <WeeklyPerformance weeklyReview={weeklyReview} itemAnim={item} />
            </div>
            <DeferredOnVisible minHeight={320} fallback={<div className="glass-card h-[320px]" />}>
              <Suspense fallback={<div className="glass-card h-[320px]" />}>
                <PerformanceRadar radarData={radarData} itemAnim={item} />
              </Suspense>
            </DeferredOnVisible>
          </div>

          {/* Pearson Correlation Engine */}
          <div className="w-full">
            <DeferredOnVisible minHeight={360} fallback={<div className="glass-card h-[360px]" />}>
              <Suspense fallback={<div className="glass-card h-[360px]" />}>
                <HourlyPerformance focusSessions={focusSessions} />
              </Suspense>
            </DeferredOnVisible>
          </div>

          {/* Contribution Heatmap Grid */}
          <ActivityHeatmap
            heatmapData={heatmapData}
            setSelectedDate={setSelectedDate}
            itemAnim={item}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════ HEALTH TAB ════════════════════════════════════════════ */}
      {activeTab === 'biometrics' && (
        <div className="space-y-8 relative z-10">
          {/* Health overview + radar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div variants={item} className="lg:col-span-2 glass-card p-8 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <Heart className="text-rose-500 animate-pulse" size={18} />
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">Health Overview</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                  {[
                    { label: 'Calories',  value: biometricStats.avgCalories,  unit: 'kcal/day', color: 'text-rose-400'   },
                    { label: 'Water',     value: biometricStats.avgWaterL,     unit: 'L/day',    color: 'text-cyan-400'   },
                    { label: 'Workout',   value: biometricStats.avgWorkoutMin, unit: 'min/day',  color: 'text-violet-400' },
                    { label: 'Sleep',     value: `${biometricStats.avgSleepHrs}h`, unit: '/ night', color: 'text-indigo-400' },
                  ].map(m => (
                    <div key={m.label}>
                      <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">{m.label}</div>
                      <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-black text-white">{m.value}</div>
                        <div className={`text-xs font-bold ${m.color}`}>{m.unit}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Metabolic flow score strip */}
                <div className="mt-8 pt-6 border-t border-white/5">
                  <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-3">7-Day Metabolic Flow Score</div>
                  <div className="flex items-end gap-2 h-14">
                    {last7DaysScores.map(d => (
                      <div key={d.dayLabel} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t-sm bg-gradient-to-t from-rose-500/60 to-pink-400/60 transition-all duration-700"
                          style={{ height: `${d.score}%` }}
                          title={`${d.dayLabel}: ${d.score}/100`}
                        />
                        <span className="text-[9px] text-white/30 font-bold">{d.dayLabel}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            <DeferredOnVisible minHeight={320} fallback={<div className="glass-card h-[320px]" />}>
              <Suspense fallback={<div className="glass-card h-[320px]" />}>
                <AnalyticsHealthCharts
                  variant="breakdown"
                  biometricStats={biometricStats}
                  biometricActivityData={biometricActivityData}
                />
              </Suspense>
            </DeferredOnVisible>
          </div>

          {/* Cognitive insights */}
          <CognitiveInsights
            cognitiveInsights={cognitiveInsights}
            itemAnim={item}
          />

          <DeferredOnVisible minHeight={700} fallback={<div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="glass-card h-[320px]" /><div className="glass-card h-[320px]" /><div className="glass-card h-[320px]" /><div className="glass-card h-[320px]" /></div>}>
            <Suspense fallback={<div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="glass-card h-[320px]" /><div className="glass-card h-[320px]" /><div className="glass-card h-[320px]" /><div className="glass-card h-[320px]" /></div>}>
              <AnalyticsHealthCharts
                variant="series"
                biometricStats={biometricStats}
                biometricActivityData={biometricActivityData}
              />
            </Suspense>
          </DeferredOnVisible>
        </div>
      )}

      {/* Modals */}
      <Suspense fallback={null}>
        {showReport && <ReportModal open={showReport} onClose={() => setShowReport(false)} />}
        <DrillDownModal date={selectedDate} onClose={() => setSelectedDate(null)} />
      </Suspense>
    </motion.div>
  );
}
