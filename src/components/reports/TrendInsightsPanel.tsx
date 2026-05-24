import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, Sparkles, Code, Flame, Droplet, Bed, 
  Dumbbell, Clock, Calendar, Check, AlertCircle, ChevronDown, ChevronUp 
} from 'lucide-react';
import type { FocusSession, LeetCodeProblem } from '../../types';
import type { WaterEntry, SleepEntry, WorkoutEntry, MealEntry } from '../../types/health';
import type { WeeklyReportStats } from '../../types/report';
import { normalizeToLocalDateString } from '../../utils/dateNormalization';
import { format } from 'date-fns';
import MiniChart from './MiniChart';

interface TrendInsightsPanelProps {
  stats: WeeklyReportStats;
  cycleDates: string[];
  focusSessions: FocusSession[];
  problems: LeetCodeProblem[];
  waterEntries: WaterEntry[];
  sleepEntries: SleepEntry[];
  workoutEntries: WorkoutEntry[];
  bookChapters: any[];
  stepsData: Record<string, number>;
  meals: MealEntry[];
  waterGoalMl: number;
}

export default function TrendInsightsPanel({
  stats,
  cycleDates,
  focusSessions,
  problems,
  waterEntries,
  sleepEntries,
  workoutEntries,
  bookChapters,
  stepsData,
  meals,
  waterGoalMl
}: TrendInsightsPanelProps) {
  const [showSparklines, setShowSparklines] = useState(false);
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

  // 1. Group LeetCode problems by date for the GitHub-style Heatmap
  const heatmapData = useMemo(() => {
    const map = new Map<string, LeetCodeProblem[]>();
    problems.forEach(p => {
      const dStr = normalizeToLocalDateString(p.date);
      if (dStr && cycleDates.includes(dStr)) {
        if (!map.has(dStr)) map.set(dStr, []);
        // Avoid duplicate saves in display grid
        if (!map.get(dStr)!.some(existing => existing.name === p.name)) {
          map.get(dStr)!.push(p);
        }
      }
    });

    return cycleDates.map(date => {
      const daySolves = map.get(date) || [];
      const completedSolves = daySolves.filter(p => p.completed);
      return {
        date,
        dayName: format(new Date(date + 'T00:00:00'), 'EEEE'),
        dayNameShort: format(new Date(date + 'T00:00:00'), 'EE'),
        solves: completedSolves,
        intensity: completedSolves.length === 0 ? 0 : completedSolves.length === 1 ? 1 : completedSolves.length === 2 ? 2 : 3
      };
    });
  }, [problems, cycleDates]);

  // 2. Dynamic Conversational Weekly Storytelling
  const storytellingNarrative = useMemo(() => {
    const focusChangeText = stats.focusChange > 0 
      ? `increased by ${stats.focusChange}% compared to last week` 
      : stats.focusChange < 0 
      ? `declined by ${Math.abs(stats.focusChange)}% compared to last week` 
      : `remained balanced with last week's levels`;

    const codingChangeText = stats.codingChange > 0
      ? `successfully scaled up by ${stats.codingChange}% WoW`
      : stats.codingChange < 0
      ? `shifted down by ${Math.abs(stats.codingChange)}% WoW`
      : `remained identical to last week`;

    // Sleep evaluation
    const avgSleepMin = parseFloat(stats.sleepAverageH) * 60;
    const sleepQualityText = avgSleepMin >= 450
      ? "maintaining high rest averages"
      : avgSleepMin >= 360
      ? "maintaining moderate, acceptable rest recovery"
      : "running on sleep deficits that could impact focus";

    // Build the narrative
    const sentences = [
      `Your deep work productivity total logged ${(stats.focusMinutes / 60).toFixed(1)} focus hours this week, which ${focusChangeText}.`,
      `In coding, your problem-solving volume reached ${stats.problemsSolved} completed exercises, which ${codingChangeText}.`,
      `On the physical health index, you completed ${stats.workoutCount} active workouts, maintaining an average active burn of ${Math.round(stats.totalCaloriesBurnt / 7)} kcal/day.`,
      `Your rest duration averaged ${stats.sleepAverageH} hours per night, ${sleepQualityText}.`
    ];

    // Correlate with best day
    if (stats.bestFocusDay !== 'N/A') {
      sentences.push(`${stats.bestFocusDay} stood out as your high-impact peak productivity session day, where focus durations reached maximum bounds.`);
    }

    return sentences.join(' ');
  }, [stats]);

  // 3. Streak and Habit Calendar matrix row
  const streakCalendar = useMemo(() => {
    return cycleDates.map(date => {
      // Focus Check
      const daySessions = focusSessions.filter(s => normalizeToLocalDateString(s.date || s.startTime) === date && s.completed);
      const focusMin = daySessions.reduce((acc, s) => acc + (s.actualDuration || s.duration), 0);
      const focusPassed = focusMin >= 45; // 45 min target per day

      // Hydration Check
      const dayWater = waterEntries.filter(w => normalizeToLocalDateString(w.date) === date);
      const waterTotal = dayWater.reduce((acc, w) => acc + w.amount, 0);
      const waterPassed = waterTotal >= waterGoalMl * 0.9;

      // Sleep Check
      const daySleep = sleepEntries.find(s => normalizeToLocalDateString(s.date) === date);
      const sleepPassed = daySleep ? daySleep.totalMinutes >= 360 : false; // 6h recovery threshold

      // Workout Check
      const dayWorkouts = workoutEntries.filter(w => normalizeToLocalDateString(w.date) === date);
      const workoutPassed = dayWorkouts.length > 0;

      const passedCount = [focusPassed, waterPassed, sleepPassed, workoutPassed].filter(Boolean).length;

      return {
        date,
        dayLabel: format(new Date(date + 'T00:00:00'), 'EE'),
        dayNum: format(new Date(date + 'T00:00:00'), 'd'),
        focusPassed,
        waterPassed,
        sleepPassed,
        workoutPassed,
        passedCount
      };
    });
  }, [cycleDates, focusSessions, waterEntries, sleepEntries, workoutEntries, waterGoalMl]);

  // SVG Hydration progress circle calculations
  const hydrationRadius = 26;
  const hydrationStroke = 4;
  const hydrationNormRadius = hydrationRadius - hydrationStroke * 2;
  const hydrationCircumference = hydrationNormRadius * 2 * Math.PI;
  const hydrationPct = Math.min(stats.totalWaterIntakeMl / (waterGoalMl * 7), 1);
  const hydrationOffset = hydrationCircumference - hydrationPct * hydrationCircumference;

  return (
    <div className="space-y-6">
      
      {/* 1. WEEKLY NARRATIVE STORYTELLER CARD */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-zinc-900/60 to-zinc-950/40 border border-white/5 space-y-3 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[65px] pointer-events-none" />
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-violet-400 animate-pulse" />
          <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Weekly Storyteller Narrative</span>
        </div>
        <p className="text-xs sm:text-sm font-semibold text-white/80 leading-relaxed italic">
          "{storytellingNarrative}"
        </p>
      </div>

      {/* 2. GITHUB-STYLE CODING CONTRIBUTION HEATMAP */}
      <div className="p-5 rounded-3xl bg-white/[0.01] border border-white/5 space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-0.5">
            <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              <Code size={13} /> LeetCode Contribution Grid
            </span>
            <h4 className="text-xs font-bold text-white/50">Unique problem solves mapping index</h4>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded-md">
            {stats.problemsSolved} Solves Completed
          </span>
        </div>

        {/* Heatmap Grid Row */}
        <div className="grid grid-cols-7 gap-2.5 sm:gap-4 pt-1.5 text-center">
          {heatmapData.map((day, idx) => {
            // Colors matching GitHub green but mapped to cyan for premium OS branding
            const colorClass = 
              day.intensity === 0 
                ? 'bg-zinc-950 border border-white/[0.03]' 
                : day.intensity === 1
                ? 'bg-cyan-950/50 border border-cyan-500/20 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.1)]'
                : day.intensity === 2
                ? 'bg-cyan-800/40 border border-cyan-500/40 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'bg-cyan-500 border border-cyan-400 text-black font-black shadow-[0_0_16px_rgba(6,182,212,0.45)]';

            const isHovered = hoveredDayIdx === idx;

            return (
              <div 
                key={idx}
                onMouseEnter={() => setHoveredDayIdx(idx)}
                onMouseLeave={() => setHoveredDayIdx(null)}
                className="flex flex-col items-center gap-2 group relative cursor-pointer"
              >
                {/* Floating tooltip with solved problem titles on day hover */}
                <AnimatePresence>
                  {isHovered && day.solves.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute bottom-full mb-2 bg-zinc-900 border border-white/10 p-2.5 rounded-xl text-left space-y-1.5 shadow-2xl z-20 w-44 pointer-events-none"
                    >
                      <span className="text-[8px] font-black uppercase text-cyan-400 tracking-wider">Solved Problems ({day.solves.length})</span>
                      <ul className="space-y-1 text-[9px] font-semibold text-white/80 leading-normal max-h-24 overflow-y-auto">
                        {day.solves.map((p, pIdx) => (
                          <li key={pIdx} className="truncate">• {p.name}</li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>

                <span className="text-[9px] font-bold text-white/30 uppercase">{day.dayNameShort}</span>
                <div 
                  className={`w-10 h-10 rounded-xl transition-all duration-300 flex items-center justify-center text-xs font-bold ${colorClass}`}
                >
                  {day.solves.length > 0 ? day.solves.length : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. DUAL CORE VISUAL GRID (Calories Intake vs. Burn + Hydration Ring) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Calorie Intake vs Burn double progress bars */}
        <div className="p-5 rounded-3xl bg-white/[0.01] border border-white/5 md:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
              <Flame size={13} /> Calorie Balance Index
            </span>
            <span className="text-[10px] font-bold text-white/30">Active Daily Target Range</span>
          </div>

          <div className="space-y-3.5">
            {/* Intake */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-white/60">
                <span className="flex items-center gap-1">🍎 Total Calories Taken</span>
                <span className="font-bold text-white">{stats.totalCaloriesTaken.toLocaleString()} kcal</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
                <div 
                  className="h-full bg-gradient-to-r from-orange-400 to-rose-400 rounded-full shadow-[0_0_8px_rgba(251,146,60,0.3)]"
                  style={{ width: `${Math.min((stats.totalCaloriesTaken / 14000) * 100, 100)}%` }} // 14k target baseline weekly
                />
              </div>
            </div>

            {/* Burn */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-white/60">
                <span className="flex items-center gap-1">🔥 Active Workout Burn</span>
                <span className="font-bold text-white">{stats.totalCaloriesBurnt.toLocaleString()} kcal</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
                <div 
                  className="h-full bg-gradient-to-r from-rose-500 to-red-400 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                  style={{ width: `${Math.min((stats.totalCaloriesBurnt / 3500) * 100, 100)}%` }} // 3.5k burn weekly target
                />
              </div>
            </div>
          </div>
        </div>

        {/* Hydration progress ring */}
        <div className="p-5 rounded-3xl bg-white/[0.01] border border-white/5 flex flex-col justify-between items-center hover:bg-white/[0.02] transition-all">
          <div className="w-full flex justify-between items-center">
            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
              <Droplet size={13} /> Hydration Ring
            </span>
            <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded">
              {Math.round(hydrationPct * 100)}%
            </span>
          </div>

          {/* SVG Ring circle */}
          <div className="relative flex items-center justify-center my-2 shrink-0">
            <svg
              height={hydrationRadius * 2}
              width={hydrationRadius * 2}
              className="transform -rotate-90 filter drop-shadow-[0_0_8px_rgba(59,130,246,0.25)]"
            >
              <circle
                stroke="rgba(255,255,255,0.03)"
                fill="transparent"
                strokeWidth={hydrationStroke}
                r={hydrationNormRadius}
                cx={hydrationRadius}
                cy={hydrationRadius}
              />
              <circle
                stroke="url(#hydrationGradient)"
                fill="transparent"
                strokeWidth={hydrationStroke}
                strokeDasharray={hydrationCircumference + ' ' + hydrationCircumference}
                style={{ strokeDashoffset: hydrationOffset }}
                strokeLinecap="round"
                r={hydrationNormRadius}
                cx={hydrationRadius}
                cy={hydrationRadius}
              />
              <defs>
                <linearGradient id="hydrationGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute text-[8px] font-black text-white/90">💧 ring</span>
          </div>

          <span className="text-[10px] text-white/50 font-bold text-center mt-1">
            {(stats.totalWaterIntakeMl / 1000).toFixed(1)}L / {((waterGoalMl * 7) / 1000).toFixed(1)}L weekly
          </span>
        </div>

      </div>

      {/* 4. STREAK CONTINUITY CALENDAR */}
      <div className="p-5 rounded-3xl bg-white/[0.01] border border-white/5 space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-0.5">
            <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar size={13} /> Streak Continuity Calendar
            </span>
            <h4 className="text-xs font-bold text-white/50">Daily 4-Pillar targets matrix (🧠 Focus, 💧 Water, 💤 Sleep, 🏋️ Workout)</h4>
          </div>
          <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
            Target checkmarks timeline
          </span>
        </div>

        {/* Streak Row */}
        <div className="grid grid-cols-7 gap-2.5 sm:gap-4 pt-1 text-center">
          {streakCalendar.map((day, idx) => {
            const hasPerfectScore = day.passedCount === 4;
            const hasZeroScore = day.passedCount === 0;

            const cardStyle = hasPerfectScore 
              ? 'bg-gradient-to-b from-emerald-500/15 to-transparent border-emerald-500/25' 
              : hasZeroScore 
              ? 'bg-zinc-950/40 border-white/[0.02]' 
              : 'bg-white/[0.01] border-white/5';

            return (
              <div 
                key={idx}
                className={`p-2.5 rounded-2xl border flex flex-col items-center gap-2.5 ${cardStyle}`}
              >
                <div>
                  <span className="block text-[8px] font-black text-white/30 uppercase leading-none">{day.dayLabel}</span>
                  <span className="block text-xs font-black text-white mt-1 leading-none">{day.dayNum}</span>
                </div>

                {/* Pillar Indicators Matrix */}
                <div className="grid grid-cols-2 gap-1 flex-shrink-0">
                  {/* Focus */}
                  <span 
                    className={`w-3.5 h-3.5 rounded-md flex items-center justify-center text-[8px] border transition-all ${
                      day.focusPassed 
                        ? 'bg-violet-500/20 text-violet-400 border-violet-500/35 shadow-[0_0_4px_rgba(139,92,246,0.1)]' 
                        : 'bg-white/[0.02] border-white/5 text-white/10'
                    }`}
                    title="🧠 Focus Goal (>=45m)"
                  >
                    🧠
                  </span>
                  {/* Water */}
                  <span 
                    className={`w-3.5 h-3.5 rounded-md flex items-center justify-center text-[8px] border transition-all ${
                      day.waterPassed 
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/35 shadow-[0_0_4px_rgba(59,130,246,0.1)]' 
                        : 'bg-white/[0.02] border-white/5 text-white/10'
                    }`}
                    title="💧 Water Goal (>=90%)"
                  >
                    💧
                  </span>
                  {/* Sleep */}
                  <span 
                    className={`w-3.5 h-3.5 rounded-md flex items-center justify-center text-[8px] border transition-all ${
                      day.sleepPassed 
                        ? 'bg-pink-500/20 text-pink-400 border-pink-500/35 shadow-[0_0_4px_rgba(236,72,153,0.1)]' 
                        : 'bg-white/[0.02] border-white/5 text-white/10'
                    }`}
                    title="💤 Sleep Goal (>=6h)"
                  >
                    💤
                  </span>
                  {/* Workout */}
                  <span 
                    className={`w-3.5 h-3.5 rounded-md flex items-center justify-center text-[8px] border transition-all ${
                      day.workoutPassed 
                        ? 'bg-orange-500/20 text-orange-400 border-orange-500/35 shadow-[0_0_4px_rgba(249,115,22,0.1)]' 
                        : 'bg-white/[0.02] border-white/5 text-white/10'
                    }`}
                    title="🏋️ Active Workout logged"
                  >
                    🏋️
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. DIAGNOSTICS & RAW SPARKLINE TRENDS (EXPANDABLE) */}
      <div className="pt-2 border-t border-white/5">
        <button
          onClick={() => setShowSparklines(!showSparklines)}
          className="w-full py-3.5 px-5 rounded-2xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs font-black uppercase tracking-wider text-white/50"
        >
          <span className="flex items-center gap-2">
            📊 View Raw Diagnostics Sparklines
          </span>
          {showSparklines ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <AnimatePresence>
          {showSparklines && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-4 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MiniChart 
                  label="Focus Minutes Trend" 
                  dataPoints={stats.focusChartData} 
                  cycleDates={cycleDates} 
                  colorClass="bg-violet-500" 
                  unit="min" 
                />
                <MiniChart 
                  label="Coding Activity Trend" 
                  dataPoints={stats.codingChartData} 
                  cycleDates={cycleDates} 
                  colorClass="bg-cyan-500" 
                  unit="solved" 
                />
                <MiniChart 
                  label="Book Chapters Completed" 
                  dataPoints={stats.readingChartData} 
                  cycleDates={cycleDates} 
                  colorClass="bg-amber-500" 
                  unit="ch" 
                />
                <MiniChart 
                  label="Hydration Volumes" 
                  dataPoints={stats.waterChartData} 
                  cycleDates={cycleDates} 
                  colorClass="bg-blue-500" 
                  unit="ml" 
                />
                <MiniChart 
                  label="Sleep Duration" 
                  dataPoints={stats.sleepChartData} 
                  cycleDates={cycleDates} 
                  colorClass="bg-pink-500" 
                  unit="min" 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
