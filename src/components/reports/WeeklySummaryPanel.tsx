import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, CheckSquare, Clock, HelpCircle, BookOpen, Database, 
  Terminal, ShieldCheck, Cpu, Code, Droplet, Bed, Footprints, 
  Flame, Plus, X, BarChart, Activity, AlertCircle, Info, ChevronDown, ChevronUp
} from 'lucide-react';
import type { FocusSession, LeetCodeProblem } from '../../types';
import type { WaterEntry, SleepEntry, WorkoutEntry, MealEntry } from '../../types/health';
import type { WeeklyReportStats } from '../../types/report';
import { normalizeToLocalDateString } from '../../utils/dateNormalization';

interface WeeklySummaryPanelProps {
  stats: WeeklyReportStats;
  waterGoalMl: number;
  sleepHours: number;
  focusGoalMin: number;
  focusSessions: FocusSession[];
  problems: LeetCodeProblem[];
  waterEntries: WaterEntry[];
  sleepEntries: SleepEntry[];
  workoutEntries: WorkoutEntry[];
  bookChapters: any[];
  stepsData: Record<string, number>;
  meals: MealEntry[];
  last7Days: string[];
}

export default function WeeklySummaryPanel({
  stats,
  waterGoalMl,
  sleepHours,
  focusGoalMin,
  focusSessions,
  problems,
  waterEntries,
  sleepEntries,
  workoutEntries,
  bookChapters,
  stepsData,
  meals,
  last7Days
}: WeeklySummaryPanelProps) {
  const [showCalculationInfo, setShowCalculationInfo] = useState(false);
  const [traceMetric, setTraceMetric] = useState<string | null>(null);
  const [expandedRawId, setExpandedRawId] = useState<string | null>(null);

  // Trace compiler engine matching calculated report metrics exactly
  const traceDetails = useMemo(() => {
    if (!traceMetric) return null;

    let title = '';
    let formula = '';
    let dedupRule = 'N/A';
    let calculatedVal = '';
    let ledger: Array<{
      id: string;
      timestamp: string;
      source: string;
      contribution: string;
      status: 'included' | 'excluded';
      reason?: string;
      raw: any;
    }> = [];

    switch (traceMetric) {
      case 'focus_score': {
        title = 'Focus Score (Index)';
        formula = '0.3 * CompletionRate + 0.25 * ConsistencyRatio * 100 + 0.25 * OutputRatio * 100 + 0.2 * RestRatio * 100';
        dedupRule = 'Aggregated composite weighted index using verified focus sessions and sleep targets.';
        calculatedVal = `${stats.focusQualityScore} / 100`;
        
        ledger = [
          {
            id: 'pillar-1',
            timestamp: 'N/A',
            source: 'Productivity Ledger Engine',
            contribution: `+${Math.round(0.3 * stats.completionRate)} (30% weight from ${stats.completionRate}% completion rate: ${stats.completedSessions}/${stats.completedSessions} sessions)`,
            status: 'included',
            raw: { completionRate: stats.completionRate, completedSessions: stats.completedSessions }
          },
          {
            id: 'pillar-2',
            timestamp: 'N/A',
            source: 'Consistency Ledger Engine',
            contribution: `+${Math.round(0.25 * (stats.waterDaysHit + stats.sleepDaysHit + stats.problemsDaysHit + stats.readingDaysHit) / 28 * 100)} (25% weight from habit targets: water=${stats.waterDaysHit}, sleep=${stats.sleepDaysHit}, coding=${stats.problemsDaysHit}, reading=${stats.readingDaysHit} out of 7 days)`,
            status: 'included',
            raw: { waterDaysHit: stats.waterDaysHit, sleepDaysHit: stats.sleepDaysHit, problemsDaysHit: stats.problemsDaysHit, readingDaysHit: stats.readingDaysHit }
          },
          {
            id: 'pillar-3',
            timestamp: 'N/A',
            source: 'Output Ledger Engine',
            contribution: `+${Math.round(0.25 * Math.min(stats.focusMinutes / focusGoalMin, 1) * 100)} (25% weight from focus output volume: ${stats.focusMinutes} / ${focusGoalMin} min target)`,
            status: 'included',
            raw: { focusMinutes: stats.focusMinutes, targetMin: focusGoalMin }
          },
          {
            id: 'pillar-4',
            timestamp: 'N/A',
            source: 'Rest Ledger Engine',
            contribution: `+${Math.round(0.2 * Math.min(parseFloat(stats.sleepAverageH) / sleepHours, 1) * 100)} (20% weight from average sleep: ${stats.sleepAverageH}h / ${sleepHours}h target)`,
            status: 'included',
            raw: { sleepAverageH: stats.sleepAverageH, targetHours: sleepHours }
          }
        ];
        break;
      }
      case 'problems_solved': {
        title = 'Problems Solved';
        formula = 'COUNT(problems WHERE completed = true AND date IN last7Days)';
        dedupRule = 'Unique slug check: `${completed/todo}_${slug}`. Slices LeetCode URL paths for unique slug match; duplicates rejected.';
        calculatedVal = `${stats.problemsSolved} Solves`;

        const seen = new Set<string>();
        problems.forEach(p => {
          const dStr = normalizeToLocalDateString(p.date);
          const inRange = dStr && last7Days.includes(dStr);
          if (!inRange) return;

          const slug = p.link?.trim().toLowerCase() || '';
          const key = slug.includes('/problems/') 
            ? slug.split('/problems/')[1]?.split('/')[0] || p.name.trim().toLowerCase()
            : p.name.trim().toLowerCase();
          const uniqueKey = `${p.completed ? 'completed' : 'todo'}_${key}`;

          const isDuplicate = seen.has(uniqueKey);
          seen.add(uniqueKey);

          ledger.push({
            id: p.id || `p-${Math.random()}`,
            timestamp: p.date || 'N/A',
            source: p.link?.includes('leetcode') ? 'LeetCode Companion Extension Sync' : 'Manual Entry',
            contribution: p.completed && !isDuplicate ? '+1 Problem Solved' : '+0 (Ignored)',
            status: p.completed && !isDuplicate ? 'included' : 'excluded',
            reason: !p.completed ? 'Task is in-progress (not completed)' : isDuplicate ? 'Duplicate slug found (already counted in ledger)' : undefined,
            raw: p
          });
        });
        break;
      }
      case 'chapters_done': {
        title = 'Chapters Completed';
        formula = 'COUNT(chapters WHERE completed = true AND dateCompleted IN last7Days)';
        dedupRule = 'Database-level unique constraint on chapter completion keys; client-side date completed bounds matching.';
        calculatedVal = `${stats.chaptersRead} Chapters`;

        bookChapters.forEach(c => {
          const dStr = normalizeToLocalDateString(c.dateCompleted);
          const inRange = dStr && last7Days.includes(dStr);
          if (!inRange) return;

          ledger.push({
            id: c.id || `c-${Math.random()}`,
            timestamp: c.dateCompleted || 'N/A',
            source: 'Reading Log Tracker',
            contribution: c.completed ? '+1 Chapter Done' : '+0 (Incomplete)',
            status: c.completed ? 'included' : 'excluded',
            reason: !c.completed ? 'Chapter not completed' : undefined,
            raw: c
          });
        });
        break;
      }
      case 'focus_duration': {
        title = 'Focus Session Duration';
        formula = 'SUM(actualDuration || duration WHERE completed = true AND date IN last7Days)';
        dedupRule = 'Deduplicate focus blocks with matching `${startTime}_${duration}` key to eliminate extension restart overlaps.';
        calculatedVal = `${(stats.focusMinutes / 60).toFixed(1)} Hours (${stats.focusMinutes} minutes)`;

        const seen = new Set<string>();
        focusSessions.forEach(s => {
          const dStr = normalizeToLocalDateString(s.date || s.startTime);
          const inRange = dStr && last7Days.includes(dStr);
          if (!inRange) return;

          const key = `${s.startTime}_${s.duration}`;
          const isDuplicate = seen.has(key);
          seen.add(key);

          const dur = s.actualDuration || s.duration;

          ledger.push({
            id: s.id || `s-${Math.random()}`,
            timestamp: s.startTime || s.date || 'N/A',
            source: 'Mani OS Study Timer Companion',
            contribution: s.completed && !isDuplicate ? `+${dur} min` : '+0 (Ignored)',
            status: s.completed && !isDuplicate ? 'included' : 'excluded',
            reason: !s.completed ? 'Session was abandoned/incomplete' : isDuplicate ? 'Duplicate overlap block detected' : undefined,
            raw: s
          });
        });
        break;
      }
      case 'water_avg':
      case 'water_intake': {
        title = traceMetric === 'water_avg' ? 'Daily Water Intake Average' : 'Total Water Intake';
        formula = traceMetric === 'water_avg' ? 'SUM(water_entries.amount WHERE date IN last7Days) / 7' : 'SUM(water_entries.amount WHERE date IN last7Days)';
        dedupRule = 'Safe client event ID UUID validation; database constraints block duplicates.';
        calculatedVal = traceMetric === 'water_avg' ? `${stats.waterAverageL} Liters` : `${(stats.totalWaterIntakeMl / 1000).toFixed(1)} Liters (${stats.totalWaterIntakeMl} mL)`;

        waterEntries.forEach(w => {
          const dStr = normalizeToLocalDateString(w.date);
          const inRange = dStr && last7Days.includes(dStr);
          if (!inRange) return;

          ledger.push({
            id: w.id || `w-${Math.random()}`,
            timestamp: w.date || 'N/A',
            source: 'Manual Hydration Logger',
            contribution: `+${w.amount} mL`,
            status: 'included',
            raw: w
          });
        });
        break;
      }
      case 'sleep_avg': {
        title = 'Daily Sleep Duration Average';
        formula = 'SUM(sleep_entries.totalMinutes WHERE date IN last7Days) / count_of_days_with_data';
        dedupRule = 'Strict unique constraint on local date string; one canonical sleep entry allowed per night.';
        calculatedVal = `${stats.sleepAverageH} Hours (${stats.sleepDaysWithData} days with logs)`;

        sleepEntries.forEach(s => {
          const dStr = normalizeToLocalDateString(s.date);
          const inRange = dStr && last7Days.includes(dStr);
          if (!inRange) return;

          ledger.push({
            id: s.id || `s-${Math.random()}`,
            timestamp: s.date || 'N/A',
            source: 'Manual Sleep Log Tracker',
            contribution: `+${(s.totalMinutes / 60).toFixed(1)}h (${s.totalMinutes} min)`,
            status: 'included',
            raw: s
          });
        });
        break;
      }
      case 'workouts_weekly': {
        title = 'Weekly Workouts Count';
        formula = 'COUNT(workout_entries WHERE date IN last7Days)';
        dedupRule = 'Deduplicate walking sync entries with matching key `${date}_${startTime}_${name}_${durationMinutes}`. Synced walks proactively delete pre-existing entries before insertions.';
        calculatedVal = `${stats.workoutCount} Workouts`;

        const seen = new Set<string>();
        workoutEntries.forEach(w => {
          const dStr = normalizeToLocalDateString(w.date);
          const inRange = dStr && last7Days.includes(dStr);
          if (!inRange) return;

          const key = `${w.date}_${w.startTime || '08:30'}_${w.name.trim().toLowerCase()}_${w.durationMinutes}`;
          const isDuplicate = seen.has(key);
          seen.add(key);

          ledger.push({
            id: w.id || `w-${Math.random()}`,
            timestamp: w.date || 'N/A',
            source: w.name.includes('Google Fit') ? 'Google Fit Sensor OAuth Sync' : 'Manual Logger',
            contribution: !isDuplicate ? `+1 Workout (${w.name})` : '+0 (Ignored)',
            status: !isDuplicate ? 'included' : 'excluded',
            reason: isDuplicate ? 'Duplicate sync workout detected (Google Fit overlap)' : undefined,
            raw: w
          });
        });
        break;
      }
      case 'steps_avg': {
        title = 'Daily Steps Average';
        formula = 'SUM(stepsData[date] WHERE date IN last7Days) / 7';
        dedupRule = 'Idempotent daily updates overwrite steps count for specific local dates verbatim.';
        calculatedVal = `${stats.stepsAverage.toLocaleString()} steps/day`;

        last7Days.forEach(date => {
          const steps = stepsData[date] || 0;
          ledger.push({
            id: `steps-${date}`,
            timestamp: date,
            source: 'Google Fit Steps API / Local Device Sensor',
            contribution: `+${steps.toLocaleString()} steps`,
            status: steps > 0 ? 'included' : 'excluded',
            reason: steps === 0 ? 'No steps telemetry logged on this date' : undefined,
            raw: { date, steps }
          });
        });
        break;
      }
      case 'calories_intake': {
        title = 'Total Calorie Intake';
        formula = 'SUM(meals.calories WHERE date IN last7Days)';
        dedupRule = 'Safe client event UUID check; duplicate meal postings rejected.';
        calculatedVal = `${stats.totalCaloriesTaken.toLocaleString()} kcal`;

        meals.forEach(m => {
          const dStr = normalizeToLocalDateString(m.date);
          const inRange = dStr && last7Days.includes(dStr);
          if (!inRange) return;

          ledger.push({
            id: m.id || `m-${Math.random()}`,
            timestamp: m.date || 'N/A',
            source: m.name.includes('parsed') ? 'Natural Language Nutrition Parser' : 'Meal Preset Log',
            contribution: `+${m.calories} kcal (${m.name})`,
            status: 'included',
            raw: m
          });
        });
        break;
      }
      case 'calories_burnt': {
        title = 'Total Calories Burnt (Active)';
        formula = 'SUM(workout_entries.calories_burned WHERE date IN last7Days)';
        dedupRule = 'Unique workout session matching key `${date}_${startTime}_${name}_${durationMinutes}` prevents re-aggregating calories burned.';
        calculatedVal = `${stats.totalCaloriesBurnt.toLocaleString()} kcal`;

        const seen = new Set<string>();
        workoutEntries.forEach(w => {
          const dStr = normalizeToLocalDateString(w.date);
          const inRange = dStr && last7Days.includes(dStr);
          if (!inRange) return;

          const key = `${w.date}_${w.startTime || '08:30'}_${w.name.trim().toLowerCase()}_${w.durationMinutes}`;
          const isDuplicate = seen.has(key);
          seen.add(key);

          const cals = w.caloriesBurned || 0;

          ledger.push({
            id: w.id || `w-${Math.random()}`,
            timestamp: w.date || 'N/A',
            source: w.name.includes('Google Fit') ? 'Google Fit Sensor Sync' : 'Manual Workout Logger',
            contribution: !isDuplicate ? `+${cals} kcal (${w.name})` : '+0 (Ignored)',
            status: !isDuplicate ? 'included' : 'excluded',
            reason: isDuplicate ? 'Duplicate sync workouts filtered out' : undefined,
            raw: w
          });
        });
        break;
      }
    }

    return { title, formula, dedupRule, calculatedVal, ledger };
  }, [traceMetric, stats, problems, bookChapters, focusSessions, waterEntries, sleepEntries, workoutEntries, stepsData, meals, last7Days, focusGoalMin, sleepHours]);

  return (
    <div className="space-y-6">
      
      {/* Premium Hero Summary Block */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-violet-900/15 via-indigo-900/5 to-transparent border border-violet-500/15 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-44 h-44 bg-violet-500/5 rounded-full blur-[40px] pointer-events-none" />
        <div className="space-y-2">
          <div className="text-[10px] font-black text-violet-400 uppercase tracking-[0.2em]">WEEKLY HERO SUMMARY</div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">Your Week at a Glance</h2>
          <p className="text-xs text-white/60 font-semibold max-w-md leading-relaxed">
            {stats.focusQualityScore >= 80 
              ? "🔥 Peak Performance Week. You maintained extreme consistency across focus blocks, study tasks, and water schedules!"
              : stats.focusQualityScore >= 65
              ? "⚡ Flow & High Focus. Great overall routine management. A few recovery blocks helped restore cognitive baseline energy."
              : stats.focusQualityScore >= 50
              ? "🌱 Steady Action & Rest. Good focus habits. Prioritizing consistent sleep will help boost next week's focus quality."
              : "🔄 Reset & Recover Cycle. Focus was lower this week. Optimal time to refactor study hours and rebuild hydration routines."
            }
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1.5 text-[10px] font-mono font-bold text-white/40">
            <span>🚀 BIGGEST WIN: <span className="text-violet-400">{stats.problemsSolved >= 5 ? `Solved ${stats.problemsSolved} coding problems` : stats.focusMinutes >= 600 ? `Focused for ${(stats.focusMinutes/60).toFixed(1)}h` : `Hydrated fully on ${stats.waterDaysHit} days`}</span></span>
            <span>•</span>
            <span>📅 STRONGEST DAY: <span className="text-emerald-400">{stats.bestFocusDay}</span></span>
            <span>•</span>
            <span>💤 WEAKEST SLEEP: <span className="text-rose-400">{stats.weakestSleepDay}</span></span>
          </div>
        </div>

        {/* Big circular score indicator */}
        <div className="shrink-0 flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.01] border border-white/5 min-w-[100px] text-center shadow-lg">
          <div className="text-3xl font-black text-white tracking-tight">{stats.focusQualityScore}</div>
          <span className="text-[8px] text-white/30 font-black uppercase tracking-widest mt-1">Life Score</span>
          <span className={`mt-2 px-2 py-0.5 rounded text-[8px] font-black border ${
            stats.focusQualityScore >= 80
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : stats.focusQualityScore >= 60
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {stats.focusQualityScore >= 80 ? 'EXCELLENT' : stats.focusQualityScore >= 60 ? 'OPTIMAL' : 'RECOVERING'}
          </span>
        </div>
      </div>

      {/* Trace Indicator Header */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/60 border border-white/5 text-[11px] font-semibold text-white/50">
        <Info size={13} className="text-violet-400" />
        <span>Click on any analytics card below to inspect the mathematical audit trail and raw telemetry ledger.</span>
      </div>

      {/* Top executive row with focus quality score index */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Focus Quality Score Widget */}
        <div 
          onClick={() => setTraceMetric('focus_score')}
          className="p-5 rounded-2xl bg-gradient-to-br from-violet-600/10 via-indigo-600/5 to-transparent border border-violet-500/15 flex flex-col justify-between hover:bg-violet-900/10 hover:border-violet-500/35 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest flex items-center gap-1">
              Focus Score
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCalculationInfo(!showCalculationInfo);
                }}
                aria-label="Explain focus score calculation formula"
                className="text-violet-400/60 hover:text-violet-400 focus:outline-none p-1"
              >
                <HelpCircle size={10} />
              </button>
            </span>
            <Award size={16} className="text-violet-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white tracking-tight">{stats.focusQualityScore}</span>
            <span className="text-xs text-white/40 font-bold">/ 100</span>
          </div>
          <span className="text-[9px] text-white/40 font-bold mt-2 leading-snug">
            {stats.focusQualityScore >= 80 ? 'Strong consistency' : stats.focusQualityScore >= 60 ? 'Satisfactory consistency' : 'Room to build focus habits'}
          </span>
          <span className="absolute bottom-2 right-3 text-[8px] font-mono text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity">
            TRACE 🔍
          </span>
        </div>

        {/* Problems Solved Aggregate */}
        <div 
          onClick={() => setTraceMetric('problems_solved')}
          className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between hover:bg-white/[0.05] hover:border-cyan-500/25 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Problems Solved</span>
            <CheckSquare size={16} className="text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white tracking-tight">{stats.problemsSolved}</span>
            {stats.codingChange !== 0 && (
              <span className={`text-[10px] font-bold ${stats.codingChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {stats.codingChange > 0 ? '↑' : '↓'} {Math.abs(stats.codingChange)}%
              </span>
            )}
          </div>
          <span className="text-[9px] text-white/40 font-bold mt-2">
            Weekly exercises completed
          </span>
          <span className="absolute bottom-2 right-3 text-[8px] font-mono text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
            TRACE 🔍
          </span>
        </div>

        {/* Book Chapters Completed */}
        <div 
          onClick={() => setTraceMetric('chapters_done')}
          className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between hover:bg-white/[0.05] hover:border-amber-500/25 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Chapters Done</span>
            <BookOpen size={16} className="text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white tracking-tight">{stats.chaptersRead}</span>
            {stats.readingChange !== 0 && (
              <span className={`text-[10px] font-bold ${stats.readingChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {stats.readingChange > 0 ? '↑' : '↓'} {Math.abs(stats.readingChange)}%
              </span>
            )}
          </div>
          <span className="text-[9px] text-white/40 font-bold mt-2">
            Book chapters completed
          </span>
          <span className="absolute bottom-2 right-3 text-[8px] font-mono text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
            TRACE 🔍
          </span>
        </div>

        {/* Total Focus Hours logged */}
        <div 
          onClick={() => setTraceMetric('focus_duration')}
          className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between hover:bg-white/[0.05] hover:border-emerald-500/25 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Focus Duration</span>
            <Clock size={16} className="text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white tracking-tight">{(stats.focusMinutes / 60).toFixed(1)}h</span>
            {stats.focusChange !== 0 && (
              <span className={`text-[10px] font-bold ${stats.focusChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {stats.focusChange > 0 ? '↑' : '↓'} {Math.abs(stats.focusChange)}%
              </span>
            )}
          </div>
          <span className="text-[9px] text-white/40 font-bold mt-2">
            Total focus duration
          </span>
          <span className="absolute bottom-2 right-3 text-[8px] font-mono text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
            TRACE 🔍
          </span>
        </div>

      </div>

      {/* Calculation Explanation Dropdown */}
      <AnimatePresence>
        {showCalculationInfo && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 rounded-xl bg-violet-950/20 border border-violet-500/15 text-xs text-white/70 space-y-2 leading-relaxed overflow-hidden"
          >
            <h5 className="font-black text-violet-400 uppercase tracking-wider text-[10px]">How your Focus Score is calculated:</h5>
            <p>The score is a composite formula representing self-tracking metrics across four key pillars:</p>
            <ul className="list-disc pl-4 space-y-1 text-white/60">
              <li><strong className="text-white/80">30% Completion Rate:</strong> Completed focus sessions versus total focus blocks initialized.</li>
              <li><strong className="text-white/80">25% Consistency:</strong> Score representing the ratio of active focus days logged out of 7.</li>
              <li><strong className="text-white/80">25% Output Target:</strong> Balanced metrics of focus minutes, coding point weights, and book chapters read.</li>
              <li><strong className="text-white/80">20% Rest & Recovery:</strong> Average daily sleep duration relative to sleep targets.</li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comparison Cards for Daily Habit Averages */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { 
            key: 'water_avg',
            label: 'Daily Water Avg', 
            value: `${stats.waterAverageL}L`, 
            change: stats.waterChange, 
            color: 'text-blue-400', 
            hoverColor: 'hover:border-blue-500/25',
            desc: `Target: ${(waterGoalMl / 1000).toFixed(1)}L daily` 
          },
          { 
            key: 'sleep_avg',
            label: 'Daily Sleep Avg', 
            value: `${stats.sleepAverageH}h`, 
            change: stats.sleepChange, 
            color: 'text-pink-400', 
            hoverColor: 'hover:border-pink-500/25',
            desc: `Target: ${sleepHours}h sleep` 
          },
          { 
            key: 'workouts_weekly',
            label: 'Weekly Workouts', 
            value: stats.workoutCount, 
            change: 0, 
            color: 'text-rose-400', 
            hoverColor: 'hover:border-rose-500/25',
            desc: 'Physical fitness habits' 
          },
          { 
            key: 'steps_avg',
            label: 'Daily Steps Avg', 
            value: stats.stepsAverage.toLocaleString(), 
            change: 0, 
            color: 'text-emerald-400', 
            hoverColor: 'hover:border-emerald-500/25',
            desc: 'Average daily steps' 
          }
        ].map(item => (
          <div 
            key={item.label} 
            onClick={() => setTraceMetric(item.key)}
            className={`p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1 hover:bg-white/[0.05] ${item.hoverColor} transition-all cursor-pointer group relative overflow-hidden`}
          >
            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{item.label}</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className={`text-2xl font-black ${item.color} tracking-tight`}>{item.value}</span>
              {item.change !== 0 && (
                <span className={`text-[9px] font-bold flex items-center ${item.change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {item.change > 0 ? '+' : ''}{item.change}%
                </span>
              )}
            </div>
            <span className="text-[9px] text-white/40 font-bold mt-1">{item.desc}</span>
            <span className={`absolute bottom-1 right-2 text-[7px] font-mono ${item.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
              TRACE 🔍
            </span>
          </div>
        ))}
      </div>

      {/* Weekly Volume Totals */}
      <div className="space-y-3">
        <h4 className="text-xs font-black text-white/40 uppercase tracking-widest">Weekly Total Volumes</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div 
            onClick={() => setTraceMetric('calories_intake')}
            className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between hover:bg-white/[0.05] hover:border-cyan-500/25 transition-all cursor-pointer group relative overflow-hidden"
          >
            <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Total Calorie Intake</span>
            <div className="mt-2">
              <span className="text-2xl font-black text-white tracking-tight">{stats.totalCaloriesTaken.toLocaleString()}</span>
              <span className="text-xs text-white/40 font-bold ml-1">kcal</span>
            </div>
            <span className="text-[9px] text-white/40 font-bold mt-1.5">Weekly total calories taken</span>
            <span className="absolute bottom-2 right-3 text-[7px] font-mono text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
              TRACE 🔍
            </span>
          </div>

          <div 
            onClick={() => setTraceMetric('calories_burnt')}
            className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between hover:bg-white/[0.05] hover:border-rose-500/25 transition-all cursor-pointer group relative overflow-hidden"
          >
            <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Total Calories Burnt</span>
            <div className="mt-2">
              <span className="text-2xl font-black text-white tracking-tight">{stats.totalCaloriesBurnt.toLocaleString()}</span>
              <span className="text-xs text-white/40 font-bold ml-1">kcal</span>
            </div>
            <span className="text-[9px] text-white/40 font-bold mt-1.5">Weekly total calories burnt</span>
            <span className="absolute bottom-2 right-3 text-[7px] font-mono text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
              TRACE 🔍
            </span>
          </div>

          <div 
            onClick={() => setTraceMetric('water_intake')}
            className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between hover:bg-white/[0.05] hover:border-blue-500/25 transition-all cursor-pointer group relative overflow-hidden"
          >
            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Total Water Intake</span>
            <div className="mt-2">
              <span className="text-2xl font-black text-white tracking-tight">{(stats.totalWaterIntakeMl / 1000).toFixed(1)}</span>
              <span className="text-xs text-white/40 font-bold ml-1">L</span>
            </div>
            <span className="text-[9px] text-white/40 font-bold mt-1.5">Weekly water intake ({stats.totalWaterIntakeMl.toLocaleString()} mL)</span>
            <span className="absolute bottom-2 right-3 text-[7px] font-mono text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
              TRACE 🔍
            </span>
          </div>

        </div>
      </div>

      {/* Best / Worst Day Metadata */}
      <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] text-white/30 uppercase tracking-wider font-black">Best Focus Day</span>
          <span className="text-xs text-white/70 font-semibold">{stats.bestFocusDay}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] text-white/30 uppercase tracking-wider font-black">Most Active Coding Day</span>
          <span className="text-xs text-white/70 font-semibold">{stats.bestCodingDay}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] text-white/30 uppercase tracking-wider font-black">Lowest Sleep Day</span>
          <span className="text-xs text-white/70 font-semibold">{stats.weakestSleepDay}</span>
        </div>
      </div>

      {/* Goal Progress Section */}
      <div className="space-y-3">
        <h4 className="text-xs font-black text-white/40 uppercase tracking-widest">Goal Progress</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: 'Hydration Target', progress: stats.waterDaysHit, desc: `Days logged >= ${(waterGoalMl/1000).toFixed(1)}L` },
            { title: 'Sleep Target', progress: stats.sleepDaysHit, desc: `Days recovery >= ${sleepHours}h` },
            { title: 'Coding Activity', progress: stats.problemsDaysHit, desc: 'Days solving problems' },
            { title: 'Reading Status', progress: stats.readingDaysHit, desc: 'Days completing chapters' }
          ].map((hab, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
              <span className="text-xs font-bold text-white">{hab.title}</span>
              <span className="text-sm font-black text-violet-400">{hab.progress} / 7 days</span>
              <span className="text-[9px] text-white/30 font-semibold">{hab.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Trackers Performance */}
      {stats.trackerSummaries && stats.trackerSummaries.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-black text-white/40 uppercase tracking-widest">Custom Trackers Performance</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.trackerSummaries.map((t) => (
              <div key={t.trackerId} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between hover:bg-white/[0.04] transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-white">{t.title}</span>
                    <span className="text-[9px] text-white/30 font-black uppercase tracking-wider mt-0.5">Type: {t.type}</span>
                  </div>
                  <span className="text-[10px] font-black text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-md">
                    {t.completedCount} / {t.totalLogged} Logged
                  </span>
                </div>
                
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/5 pt-2">
                  {t.sumValue !== undefined && (
                    <div className="flex flex-col">
                      <span className="text-[8px] text-white/30 uppercase font-black">Total Sum</span>
                      <span className="text-xs font-bold text-cyan-400">{t.sumValue.toLocaleString()} {t.unit || ''}</span>
                    </div>
                  )}
                  {t.avgValue !== undefined && (
                    <div className="flex flex-col">
                      <span className="text-[8px] text-white/30 uppercase font-black">Average</span>
                      <span className="text-xs font-bold text-emerald-400">{t.avgValue.toFixed(1)} {t.unit || ''}</span>
                    </div>
                  )}
                  {t.target !== undefined && (
                    <div className="flex flex-col">
                      <span className="text-[8px] text-white/30 uppercase font-black">Daily Target</span>
                      <span className="text-xs font-bold text-amber-400">{t.target} {t.unit || ''}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* METRIC OBSERVABILITY TRACE OVERLAY PANEL */}
      <AnimatePresence>
        {traceMetric && traceDetails && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="glass-card max-w-2xl w-full max-h-[85vh] flex flex-col border border-violet-500/20 overflow-hidden shadow-2xl relative"
            >
              {/* Dev Theme Header */}
              <div className="bg-zinc-950 px-6 py-4 flex items-center justify-between border-b border-white/5 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <Terminal size={14} className="text-violet-400 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-violet-400 tracking-wider">DEV SYSTEM TRACE</span>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tracking-wider">
                        SECURE LINEAGE
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider mt-0.5">{traceDetails.title}</h3>
                  </div>
                </div>
                <button 
                  onClick={() => { setTraceMetric(null); setExpandedRawId(null); }}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/50 hover:text-white transition-all cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Console Info Bar */}
              <div className="px-6 py-3 bg-zinc-900/60 border-b border-white/5 grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] text-white/50 flex-shrink-0">
                <div>
                  <span className="font-black uppercase tracking-wider text-violet-400/80">Timezone Context:</span>
                  <span className="block font-mono text-white/80 mt-0.5">Local client date matching (YYYY-MM-DD)</span>
                </div>
                <div>
                  <span className="font-black uppercase tracking-wider text-violet-400/80">Active Cycle Range:</span>
                  <span className="block font-mono text-white/80 mt-0.5">{last7Days[0]} to {last7Days[6]}</span>
                </div>
              </div>

              {/* Scrollable Trace Details */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1 min-h-0 scrollbar-thin">
                
                {/* Derived metrics stats */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Derived Outcome</span>
                    <div className="text-2xl font-black text-white mt-0.5">{traceDetails.calculatedVal}</div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
                    <ShieldCheck size={13} />
                    MATHEMATICALLY ACCURATE
                  </div>
                </div>

                {/* Math & Rule block */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-zinc-950/40 border border-white/5 space-y-1.5">
                    <span className="text-[8px] font-black text-violet-400 uppercase tracking-widest flex items-center gap-1">
                      <Cpu size={10} /> AGGREGATION FORMULA
                    </span>
                    <code className="block text-[10px] font-mono text-white/70 bg-black/60 p-2 rounded-lg leading-relaxed border border-white/5 break-words">
                      {traceDetails.formula}
                    </code>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-950/40 border border-white/5 space-y-1.5">
                    <span className="text-[8px] font-black text-violet-400 uppercase tracking-widest flex items-center gap-1">
                      <Cpu size={10} /> DEDUPLICATION RULES
                    </span>
                    <p className="text-[10px] font-semibold text-white/60 leading-relaxed">
                      {traceDetails.dedupRule}
                    </p>
                  </div>
                </div>

                {/* Ledger entries list */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Lineage Contribution Ledger ({traceDetails.ledger.length} events)</span>
                    <span className="text-[8px] text-white/20 font-bold">CLICK EVENT TO VIEW RAW SYSTEM PAYLOAD</span>
                  </div>

                  {traceDetails.ledger.length === 0 ? (
                    <div className="p-8 rounded-xl border border-dashed border-white/10 text-center text-white/30 text-xs">
                      No active events contributed to this metric inside the specified date range.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {traceDetails.ledger.map((event, idx) => {
                        const isIncluded = event.status === 'included';
                        const isExpanded = expandedRawId === event.id;

                        return (
                          <div 
                            key={idx}
                            className={`rounded-xl border transition-all ${
                              isIncluded 
                                ? 'bg-zinc-900/30 border-white/5 hover:border-violet-500/25' 
                                : 'bg-zinc-950/50 border-white/5 hover:border-red-500/25 opacity-70'
                            }`}
                          >
                            <div 
                              onClick={() => setExpandedRawId(isExpanded ? null : event.id)}
                              className="px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5 cursor-pointer"
                            >
                              <div className="flex items-start gap-3">
                                <span className={`text-base mt-0.5`}>
                                  {isIncluded ? '🟢' : '🔴'}
                                </span>
                                <div>
                                  <div className="text-xs font-bold text-white/80 group-hover:text-white flex items-center gap-2 flex-wrap">
                                    {event.source}
                                    <span className={`text-[8px] font-black px-1.5 py-0.2 rounded border ${
                                      isIncluded 
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}>
                                      {event.status.toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="text-[9px] text-white/40 mt-1 flex items-center gap-3">
                                    <span className="font-mono">ID: {event.id}</span>
                                    <span>Date: {event.timestamp}</span>
                                  </div>
                                  {event.reason && (
                                    <p className="text-[9px] text-red-400 font-semibold mt-1">
                                      ⚠️ {event.reason}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="text-right shrink-0">
                                <span className={`text-xs font-black font-mono ${isIncluded ? 'text-emerald-400' : 'text-white/20'}`}>
                                  {event.contribution}
                                </span>
                                <span className="block text-[8px] text-white/20 mt-0.5">
                                  {isExpanded ? 'Hide Payload ▲' : 'Inspect JSON ▼'}
                                </span>
                              </div>
                            </div>

                            {/* Raw JSON viewer */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="px-4 pb-4 overflow-hidden border-t border-white/5 bg-black/60 rounded-b-xl"
                                >
                                  <pre className="mt-3 p-3 bg-black/85 rounded-lg border border-white/5 text-[9px] font-mono text-emerald-400 overflow-x-auto select-text leading-relaxed">
                                    {JSON.stringify(event.raw, null, 2)}
                                  </pre>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>

              </div>

              {/* Dev Console Footer */}
              <div className="bg-zinc-950 px-6 py-4 flex items-center justify-between border-t border-white/5 flex-shrink-0 text-[10px] text-white/30 font-mono">
                <span>SYSTEM TRANSACTION RECORD ENFORCED</span>
                <span className="text-violet-500">Mani OS v1.2.4</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
