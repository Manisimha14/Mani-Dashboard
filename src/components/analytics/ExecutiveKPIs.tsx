import React from 'react';
import { ArrowUpRight, ArrowDownRight, Target, Clock, Zap, BookOpen, Activity } from 'lucide-react';
import type { Book, LeetCodeProblem, StreakData } from '../../types';

interface ExecutiveKPIsProps {
  stats: {
    totalMin: number;
    totalMinChange: number;
    successRate: number;
    successRateChange: number;
    count: number;
    countChange: number;
    avgSession: number;
  };
  problems: LeetCodeProblem[];
  book: Pick<Book, 'chapters'>;
  focusStreak: Pick<StreakData, 'currentStreak'>;
  weeklyReview: {
    consistency: number;
  };
}

export default function ExecutiveKPIs({
  stats,
  problems,
  book,
  focusStreak,
  weeklyReview,
}: ExecutiveKPIsProps) {
  // Problems Solved Stats (Current vs Previous)
  const completedProblems = problems.filter(p => p.completed).length;
  // Let's create an elegant data representation for each KPI card
  const kpis = [
    {
      label: 'Focus Time',
      value: `${stats.totalMin}m`,
      subLabel: `${stats.totalMinChange >= 0 ? '+' : ''}${stats.totalMinChange}% vs prev period`,
      isPositive: stats.totalMinChange >= 0,
      icon: <Clock size={16} className="text-violet-400" />,
      context: 'Total minutes spent in active focus',
    },
    {
      label: 'Focus Efficiency',
      value: `${stats.successRate}%`,
      subLabel: `${stats.successRateChange >= 0 ? '+' : ''}${stats.successRateChange}% vs prev period`,
      isPositive: stats.successRateChange >= 0,
      icon: <Activity size={16} className="text-emerald-400" />,
      context: 'Ratio of successfully completed focus blocks',
    },
    {
      label: 'Session Volume',
      value: `${stats.count}`,
      subLabel: `${stats.countChange >= 0 ? '+' : ''}${stats.countChange}% vs prev period`,
      isPositive: stats.countChange >= 0,
      icon: <Zap size={16} className="text-amber-400" />,
      context: 'Total number of sessions completed',
    },
    {
      label: 'Avg Duration',
      value: `${stats.avgSession}m`,
      subLabel: 'Average completed session length',
      isPositive: true,
      icon: <Target size={16} className="text-cyan-400" />,
      context: 'Average length of completed sessions',
    },
    {
      label: 'Problems Solved',
      value: `${completedProblems}`,
      subLabel: 'Completed coding entries',
      isPositive: true,
      icon: <BookOpen size={16} className="text-blue-400" />,
      context: 'Total coding problems marked completed',
    },
    {
      label: 'Focus Streak',
      value: `${focusStreak.currentStreak}d`,
      subLabel: 'Active daily focus continuity',
      isPositive: focusStreak.currentStreak > 0,
      icon: <FlameIcon size={16} className="text-rose-400" />,
      context: 'Current consecutive days with focus logs',
    },
    {
      label: 'Consistency Score',
      value: `${weeklyReview.consistency}%`,
      subLabel: 'Active days this week',
      isPositive: weeklyReview.consistency >= 70,
      icon: <Target size={16} className="text-emerald-400" />,
      context: 'Percentage of active days in current week',
    },
    {
      label: 'Learning Completed',
      value: `${book.chapters.filter(c => c.completed).length} ch`,
      subLabel: 'Verified book milestones',
      isPositive: true,
      icon: <BookOpen size={16} className="text-fuchsia-400" />,
      context: 'Chapters marked completed in active reading',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi, idx) => (
        <div
          key={kpi.label}
          className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between relative group hover:border-white/10 transition-all duration-300 shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{kpi.label}</div>
            <div className="p-1.5 rounded-lg bg-white/5 text-white flex-shrink-0 group-hover:scale-105 transition-transform">
              {kpi.icon}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-2xl font-black text-white font-mono tracking-tight">{kpi.value}</div>
            <div className="flex items-center gap-1.5 mt-1">
              {kpi.isPositive ? (
                <ArrowUpRight size={12} className="text-emerald-400 flex-shrink-0" />
              ) : (
                <ArrowDownRight size={12} className="text-rose-400 flex-shrink-0" />
              )}
              <span className={`text-[10px] font-bold ${kpi.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {kpi.subLabel}
              </span>
            </div>
          </div>

          {/* Hover tooltips to maintain data density without clutter */}
          <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-black/95 border border-white/10 text-[9px] text-white/60 rounded px-2.5 py-1.5 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 text-center shadow-xl z-50">
            {kpi.context}
          </div>
        </div>
      ))}
    </div>
  );
}

function FlameIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}
