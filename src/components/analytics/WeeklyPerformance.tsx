import React, { Suspense, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import AnimatedCounter from '../AnimatedCounter';

interface WeeklyPerformanceProps {
  weeklyReview: {
    sessions: number;
    problems: number;
    chapters: number;
    bestDay: string;
    consistency: number;
  };
  itemAnim: any;
}

export default function WeeklyPerformance({ weeklyReview, itemAnim }: WeeklyPerformanceProps) {
  // Momentum Score Calculation based on consistency & active logs
  const momentumScore = useMemo(() => {
    const raw = Math.round((weeklyReview.sessions * 10) + (weeklyReview.problems * 15) + (weeklyReview.chapters * 20));
    return Math.min(100, Math.max(10, Math.round((weeklyReview.consistency * 0.6) + (raw * 0.4))));
  }, [weeklyReview]);

  // Determine regression warning flags
  const regressionWarning = useMemo(() => {
    if (weeklyReview.consistency < 50) {
      return 'Productivity consistency is below 50% baseline. High regression risk.';
    }
    if (weeklyReview.sessions === 0) {
      return 'Zero focus sessions logged in this active window. Momentum flatline warning.';
    }
    return null;
  }, [weeklyReview]);

  return (
    <motion.div variants={itemAnim} className="glass-card p-6 md:p-8 relative overflow-hidden bg-black/40 border border-white/5 flex flex-col justify-between h-full">
      <div className="absolute inset-0 bg-noise pointer-events-none opacity-2 opacity-[0.02]" />

      <div className="relative z-10 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <Zap className="text-amber-400" size={16} />
            <h3 className="text-lg font-black text-white tracking-tight">Performance Summary Reports</h3>
          </div>
          <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest font-mono">Report: Weekly</span>
        </div>

        {/* Dense Grid containing metric blocks */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Focus Flow</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white font-mono">{weeklyReview.sessions}</span>
              <span className="text-[10px] font-bold text-emerald-400 uppercase">sess</span>
            </div>
            <span className="text-[9px] text-white/20">Current Week</span>
          </div>

          <div>
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Weekly Output</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white font-mono">
                {weeklyReview.problems + weeklyReview.chapters}
              </span>
              <span className="text-[10px] font-bold text-cyan-400 uppercase">tasks</span>
            </div>
            <span className="text-[9px] text-white/20">Problems + Books</span>
          </div>

          <div>
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Strongest Day</div>
            <div className="text-xl font-black text-white truncate font-sans">{weeklyReview.bestDay}</div>
            <span className="text-[9px] text-white/20">Peak Output Window</span>
          </div>

          <div>
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Momentum Index</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white font-mono">{momentumScore}</span>
              <span className="text-[10px] font-bold text-violet-400 uppercase">pts</span>
            </div>
            <span className="text-[9px] text-white/20">Rolling score</span>
          </div>
        </div>

        {/* Consistency bar indicator */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-white/40 font-bold uppercase tracking-wider">Consistency Score</span>
            <span className="text-emerald-400 font-mono font-black">{weeklyReview.consistency}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" style={{ width: `${weeklyReview.consistency}%` }} />
          </div>
        </div>

        {/* Warning alerts / active status strip */}
        <div className="pt-4 border-t border-white/5">
          {regressionWarning ? (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span className="font-semibold leading-snug">{regressionWarning}</span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5">
              <ShieldCheck size={14} className="flex-shrink-0" />
              <span className="font-semibold leading-snug">Performance within normal operating parameters. No regressions detected.</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
