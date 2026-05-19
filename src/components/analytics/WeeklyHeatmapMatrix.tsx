import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays, isSameDay } from 'date-fns';
import type { FocusSession, LeetCodeProblem, DailyActivity, StreakData } from '../../types';
import type { WaterEntry, MealEntry } from '../../types/health';
import { Zap, BookOpen, Droplets, Trophy } from 'lucide-react';

interface WeeklyHeatmapMatrixProps {
  focusSessions: FocusSession[];
  problems: LeetCodeProblem[];
  waterLogs: WaterEntry[];
  meals: MealEntry[];
  dailyActivity: DailyActivity[];
  focusStreak: StreakData;
}

interface HoveredCellState {
  x: number;
  y: number;
  date: Date;
  label: string;
}

export default function WeeklyHeatmapMatrix({
  focusSessions,
  problems,
  waterLogs,
  meals,
  dailyActivity,
  focusStreak,
}: WeeklyHeatmapMatrixProps) {
  const range = 10; // Optimized compact range for high density and maximum readability

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Memoized 10-day rolling dates timeline to prevent repeated Date allocations
  const rollingDates = useMemo(() => {
    return Array.from({ length: range }).map((_, i) => {
      return subDays(new Date(), (range - 1) - i);
    });
  }, []);

  // 2. High-Performance Pre-Indexing Maps: O(1) lookups instead of expensive O(N*M) nested filters
  const focusByDate = useMemo(() => {
    const map = new Map<string, number>();
    focusSessions.forEach(s => {
      if (s.completed && s.date) {
        map.set(s.date, (map.get(s.date) || 0) + (s.actualDuration || s.duration || 0));
      }
    });
    return map;
  }, [focusSessions]);

  const problemsByDate = useMemo(() => {
    const map = new Map<string, number>();
    problems.forEach(p => {
      const dateStr = p.date;
      if (p.completed && dateStr) {
        map.set(dateStr, (map.get(dateStr) || 0) + 1);
      }
    });
    return map;
  }, [problems]);

  const readingByDate = useMemo(() => {
    const map = new Map<string, number>();
    dailyActivity.forEach(a => {
      if (a.date) {
        map.set(a.date, a.chaptersRead || 0);
      }
    });
    return map;
  }, [dailyActivity]);

  const waterByDate = useMemo(() => {
    const map = new Map<string, number>();
    waterLogs.forEach(w => {
      if (w.date) {
        map.set(w.date, (map.get(w.date) || 0) + w.amount);
      }
    });
    return map;
  }, [waterLogs]);

  const caloriesByDate = useMemo(() => {
    const map = new Map<string, number>();
    meals.forEach(m => {
      if (m.date) {
        map.set(m.date, (map.get(m.date) || 0) + (m.calories ?? 0));
      }
    });
    return map;
  }, [meals]);

  // 3. Computed matrix points lookup dataset
  const matrixData = useMemo(() => {
    return rollingDates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const focusMins = focusByDate.get(dateStr) || 0;
      const solves = problemsByDate.get(dateStr) || 0;
      const chapters = readingByDate.get(dateStr) || 0;
      const waterAmount = waterByDate.get(dateStr) || 0;
      const calorieAmount = caloriesByDate.get(dateStr) || 0;
      
      const healthPoints = (waterAmount > 0 ? 1 : 0) + (calorieAmount > 0 ? 1 : 0);

      return {
        date,
        dateStr,
        focusMins,
        solves,
        chapters,
        healthPoints,
        waterL: (waterAmount / 1000).toFixed(1),
        calories: calorieAmount,
      };
    });
  }, [rollingDates, focusByDate, problemsByDate, readingByDate, waterByDate, caloriesByDate]);

  // 4. Today specific stats selector (compiled in O(1))
  const todayData = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return matrixData.find(d => d.dateStr === todayStr) || {
      focusMins: 0,
      solves: 0,
      chapters: 0,
      waterL: '0.0',
      calories: 0,
    };
  }, [matrixData]);

  // 5. Shared single tooltip state for ultra-lightweight DOM rendering (O(1) tooltip instances!)
  const [hoveredCell, setHoveredCell] = useState<HoveredCellState | null>(null);

  // 6. Flat, GPU-friendly color mapping rules (no heavy radial gradients or shadow filters)
  const getIntensityClass = (value: number, type: 'focus' | 'coding' | 'reading' | 'health') => {
    if (value === 0) return 'bg-white/[0.04] border border-white/5 hover:border-white/20';

    if (type === 'focus') {
      if (value < 30) return 'bg-violet-500/40 border border-violet-500/50';
      if (value < 60) return 'bg-violet-500/70 border border-violet-500/80';
      return 'bg-violet-400 border border-violet-350 shadow-[0_0_10px_rgba(167,139,250,0.3)]';
    }
    if (type === 'coding') {
      if (value === 1) return 'bg-fuchsia-500/40 border border-fuchsia-500/50';
      if (value === 2) return 'bg-fuchsia-500/70 border border-fuchsia-500/80';
      return 'bg-fuchsia-400 border border-fuchsia-350 shadow-[0_0_10px_rgba(232,121,249,0.3)]';
    }
    if (type === 'reading') {
      if (value === 1) return 'bg-cyan-500/40 border border-cyan-500/50';
      if (value === 2) return 'bg-cyan-500/70 border border-cyan-500/80';
      return 'bg-cyan-400 border border-cyan-350 shadow-[0_0_10px_rgba(34,211,238,0.3)]';
    }
    // health
    if (value === 1) return 'bg-rose-500/45 border border-rose-500/55';
    return 'bg-rose-400 border border-rose-350 shadow-[0_0_10px_rgba(251,113,133,0.3)]';
  };

  // 7. Mouse-event handlers for positioning the shared absolute tooltip
  const handleCellHover = (
    e: React.MouseEvent<HTMLDivElement> | React.FocusEvent<HTMLDivElement>,
    date: Date,
    label: string
  ) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const container = target.closest('.matrix-card-container');
    if (!container) return;
    const containerRect = container.getBoundingClientRect();

    const x = rect.left - containerRect.left + rect.width / 2;
    const y = rect.top - containerRect.top - 12;

    setHoveredCell({ x, y, date, label });
  };

  // Helper to render grid rows
  const renderRow = (type: 'focus' | 'coding' | 'reading' | 'health') => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return matrixData.map((day, idx) => {
      let val = 0;
      let label = '';
      if (type === 'focus') {
        val = day.focusMins;
        label = `${day.focusMins} mins focus`;
      } else if (type === 'coding') {
        val = day.solves;
        label = `${day.solves} solved`;
      } else if (type === 'reading') {
        val = day.chapters;
        label = `${day.chapters} chapters`;
      } else {
        val = day.healthPoints;
        label = `${day.waterL}L water, ${day.calories} kcal`;
      }

      const isToday = mounted && day.dateStr === todayStr;

      return (
        <div
          key={idx}
          tabIndex={0}
          role="gridcell"
          aria-label={`${format(day.date, 'eee MMM dd')}: ${label}`}
          onMouseEnter={(e) => handleCellHover(e, day.date, label)}
          onFocus={(e) => handleCellHover(e, day.date, label)}
          onMouseLeave={() => setHoveredCell(null)}
          onBlur={() => setHoveredCell(null)}
          className={`flex-1 h-8 rounded-lg flex-shrink-0 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-white cursor-help ${getIntensityClass(val, type)} ${
            isToday ? 'ring-2 ring-white scale-105 z-10' : ''
          }`}
        />
      );
    });
  };

  // Compute 3-character day labels and date strings memoized once
  const weekdayLabels = useMemo(() => {
    return Array.from({ length: range }).map((_, i) => {
      const d = subDays(new Date(), (range - 1) - i);
      return {
        label: format(d, 'eee'),
        dateStr: format(d, 'yyyy-MM-dd')
      };
    });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="matrix-card-container p-6 border border-white/5 relative bg-white/[0.02] shadow-sm rounded-xl"
    >
      {/* Shared Absolute Tooltip overlay (Zero DOM node duplication!) */}
      <AnimatePresence>
        {hoveredCell && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{
              position: 'absolute',
              left: hoveredCell.x,
              top: hoveredCell.y,
              transform: 'translate(-50%, -100%)',
            }}
            className="z-50 pointer-events-none"
          >
            <div className="bg-zinc-950 border border-white/10 text-[10px] font-mono rounded-lg px-2.5 py-1.5 shadow-xl text-white whitespace-nowrap">
              <div className="font-bold text-white/40">{format(hoveredCell.date, 'eee MMM dd')}</div>
              <div className="text-white mt-0.5">{hoveredCell.label}</div>
              {isSameDay(hoveredCell.date, new Date()) && (
                <div className="text-emerald-400 font-bold mt-0.5">&gt; TODAY</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
        
        {/* Left Side: Heatmap Matrix */}
        <div className="lg:col-span-3 flex flex-col justify-between space-y-6">
          
          {/* Header */}
          <div>
            <h2 className="text-xs font-black tracking-wider text-white/90 uppercase font-sans flex items-center gap-2">
              Activity Overview (10 Days)
            </h2>
            <p className="text-[10px] text-white/40 mt-0.5">
              Activity heatmap across Focus, Coding, and Health
            </p>
          </div>

          {/* Heatmap Grid */}
          <div className="space-y-4 flex-1 flex flex-col justify-center select-none" role="grid" aria-readonly="true">
            
            {/* Day of Week Headers */}
            <div className="flex items-center gap-4" role="row">
              <div className="w-20 text-[10px] font-mono text-white/20 font-bold uppercase tracking-wider flex-shrink-0">
                Category
              </div>
              <div className="flex gap-2 flex-1">
                {weekdayLabels.map((item, idx) => (
                  <div
                    key={idx}
                    role="columnheader"
                    className={`flex-1 text-center text-[10px] font-mono font-bold ${
                      mounted && item.dateStr === format(new Date(), 'yyyy-MM-dd')
                        ? 'text-emerald-400 font-black'
                        : 'text-white/20'
                    }`}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Rows */}
            {/* Focus */}
            <div className="flex items-center gap-4" role="row">
              <div className="w-20 text-[10px] font-mono text-violet-400 font-bold uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0">
                <Zap size={11} className="text-violet-400" /> Focus
              </div>
              <div className="flex gap-2 flex-1">
                {renderRow('focus')}
              </div>
            </div>

            {/* Coding */}
            <div className="flex items-center gap-4" role="row">
              <div className="w-20 text-[10px] font-mono text-fuchsia-400 font-bold uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0">
                <Trophy size={11} className="text-fuchsia-400" /> Coding
              </div>
              <div className="flex gap-2 flex-1">
                {renderRow('coding')}
              </div>
            </div>

            {/* Reading */}
            <div className="flex items-center gap-4" role="row">
              <div className="w-20 text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0">
                <BookOpen size={11} className="text-cyan-400" /> Reading
              </div>
              <div className="flex gap-2 flex-1">
                {renderRow('reading')}
              </div>
            </div>

            {/* Health */}
            <div className="flex items-center gap-4" role="row">
              <div className="w-20 text-[10px] font-mono text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0">
                <Droplets size={11} className="text-rose-400" /> Health
              </div>
              <div className="flex gap-2 flex-1">
                {renderRow('health')}
              </div>
            </div>

          </div>
        </div>

        {/* Right Side: Today's Summary Panel */}
        <div className="bg-white/[0.01] border border-white/5 rounded-xl p-5 flex flex-col justify-between h-full min-h-[200px]">
          
          <div>
            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
              <div className="text-[10px] font-black font-mono tracking-wider text-emerald-400 uppercase">
                Today's Summary
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            
            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex justify-between items-center text-white/80">
                <span className="text-white/40">Focus:</span>
                <span className="text-violet-400 font-bold">{todayData.focusMins} mins</span>
              </div>
              <div className="flex justify-between items-center text-white/80">
                <span className="text-white/40">Coding:</span>
                <span className="text-fuchsia-400 font-bold">{todayData.solves} exercises</span>
              </div>
              <div className="flex justify-between items-center text-white/80">
                <span className="text-white/40">Reading:</span>
                <span className="text-cyan-400 font-bold">{todayData.chapters} chapters</span>
              </div>
              <div className="flex justify-between items-center text-white/80">
                <span className="text-white/40">Water:</span>
                <span className="text-rose-400 font-bold">{todayData.waterL} L</span>
              </div>
              <div className="flex justify-between items-center text-white/80">
                <span className="text-white/40">Calories:</span>
                <span className="text-rose-300 font-bold">{todayData.calories} kcal</span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 mt-4 text-[9px] font-mono text-white/30 flex justify-between select-none">
            <span>Sync: Online</span>
            <span>Streak: {focusStreak.currentStreak}d</span>
          </div>

        </div>

      </div>
    </motion.div>
  );
}
