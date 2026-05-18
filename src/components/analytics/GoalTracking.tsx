import React, { useMemo } from 'react';
import { Target, Clock, Zap, BookOpen } from 'lucide-react';
import type { Book, LeetCodeProblem } from '../../types';

interface GoalTrackingProps {
  stats: {
    totalMin: number;
    count: number;
  };
  problems: LeetCodeProblem[];
  book: Pick<Book, 'chapters'>;
  biometricStats: {
    avgWaterL: string;
    avgSleepHrs: string;
  };
}

export default function GoalTracking({
  stats,
  problems,
  book,
  biometricStats,
}: GoalTrackingProps) {
  // Goal targets
  const targets = {
    focusMin: 600, // 10 hours weekly
    problems: 10,  // 10 problems weekly
    chapters: 5,   // 5 chapters weekly
    sleepHrs: 7.5, // 7.5 hours nightly
  };

  const goalsList = useMemo(() => {
    const focusVal = stats.totalMin;
    const codingVal = problems.filter(p => p.completed).length;
    const readingVal = book.chapters.filter(c => c.completed).length;
    const sleepVal = parseFloat(biometricStats.avgSleepHrs) || 0;

    const calcPct = (c: number, t: number) => Math.min(100, Math.round((c / t) * 100));

    return [
      {
        name: 'Weekly Focus Blocks',
        current: focusVal,
        target: targets.focusMin,
        pct: calcPct(focusVal, targets.focusMin),
        unit: 'min',
        variance: focusVal - targets.focusMin,
        forecast: focusVal >= targets.focusMin ? 'Target Achieved' : `${Math.ceil((targets.focusMin - focusVal) / 60)} hours remaining`,
        icon: <Clock size={14} className="text-violet-400" />,
      },
      {
        name: 'Coding Goal',
        current: codingVal,
        target: targets.problems,
        pct: calcPct(codingVal, targets.problems),
        unit: 'tasks',
        variance: codingVal - targets.problems,
        forecast: codingVal >= targets.problems ? 'Target Achieved' : `${targets.problems - codingVal} solves remaining`,
        icon: <Zap size={14} className="text-cyan-400" />,
      },
      {
        name: 'Reading Goal',
        current: readingVal,
        target: targets.chapters,
        pct: calcPct(readingVal, targets.chapters),
        unit: 'ch',
        variance: readingVal - targets.chapters,
        forecast: readingVal >= targets.chapters ? 'Target Achieved' : `${targets.chapters - readingVal} chapters remaining`,
        icon: <BookOpen size={14} className="text-fuchsia-400" />,
      },
    ];
  }, [stats, problems, book, biometricStats]);

  return (
    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-full">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5">
        <Target className="text-emerald-400" size={16} />
        <div>
          <h3 className="text-lg font-black text-white tracking-tight">Goal Tracking</h3>
          <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5">Target progress, remaining work and weekly variance</p>
        </div>
      </div>

      <div className="space-y-4">
        {goalsList.map(g => (
          <div key={g.name} className="space-y-2 p-3.5 rounded-xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-all duration-300">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold text-white/80">
                {g.icon}
                <span>{g.name}</span>
              </div>
              <span className="font-mono text-white font-black">
                {g.current}/{g.target} <span className="text-white/30 text-[9px]">{g.unit}</span>
              </span>
            </div>

            {/* Glowing progress container */}
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${g.pct}%` }} />
            </div>

            <div className="flex justify-between text-[9px] text-white/30 font-bold uppercase tracking-wider">
              <span>Variance: <span className={g.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{g.variance >= 0 ? '+' : ''}{g.variance}</span></span>
              <span>Forecast: <span className="text-white/60">{g.forecast}</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
