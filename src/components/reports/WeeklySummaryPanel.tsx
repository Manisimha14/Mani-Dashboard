import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, CheckSquare, Clock, HelpCircle, BookOpen } from 'lucide-react';
import type { WeeklyReportStats } from '../../types/report';

interface WeeklySummaryPanelProps {
  stats: WeeklyReportStats;
  waterGoalMl: number;
  sleepHours: number;
  focusGoalMin: number;
}

export default function WeeklySummaryPanel({
  stats,
  waterGoalMl,
  sleepHours,
  focusGoalMin
}: WeeklySummaryPanelProps) {
  const [showCalculationInfo, setShowCalculationInfo] = useState(false);

  return (
    <div className="space-y-6">
      
      {/* Top executive row with focus quality score index */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Focus Quality Score Widget */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-600/10 via-indigo-600/5 to-transparent border border-violet-500/15 flex flex-col justify-between hover:bg-violet-900/5 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest flex items-center gap-1">
              Focus Score
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCalculationInfo(!showCalculationInfo);
                }}
                aria-label="Explain focus score calculation formula"
                className="text-violet-400/60 hover:text-violet-400 focus:outline-none"
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
        </div>

        {/* Problems Solved Aggregate */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between hover:bg-white/[0.04] transition-all">
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
        </div>

        {/* Book Chapters Completed */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between hover:bg-white/[0.04] transition-all">
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
        </div>

        {/* Total Focus Hours logged */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between hover:bg-white/[0.04] transition-all">
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
            label: 'Daily Water Avg', 
            value: `${stats.waterAverageL}L`, 
            change: stats.waterChange, 
            color: 'text-blue-400', 
            desc: `Target: ${(waterGoalMl / 1000).toFixed(1)}L daily` 
          },
          { 
            label: 'Daily Sleep Avg', 
            value: `${stats.sleepAverageH}h`, 
            change: stats.sleepChange, 
            color: 'text-pink-400', 
            desc: `Target: ${sleepHours}h sleep` 
          },
          { 
            label: 'Weekly Workouts', 
            value: stats.workoutCount, 
            change: 0, 
            color: 'text-rose-400', 
            desc: 'Physical fitness habits' 
          },
          { 
            label: 'Daily Steps Avg', 
            value: stats.stepsAverage.toLocaleString(), 
            change: 0, 
            color: 'text-emerald-400', 
            desc: 'Average daily steps' 
          }
        ].map(item => (
          <div key={item.label} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1 hover:bg-white/[0.04] transition-all">
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
          </div>
        ))}
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
    </div>
  );
}
