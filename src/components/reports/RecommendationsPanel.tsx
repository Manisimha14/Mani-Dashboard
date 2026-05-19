import React from 'react';
import { Calendar, Sparkles } from 'lucide-react';
import type { WeeklyReportStats } from '../../types/report';

interface RecommendationsPanelProps {
  stats: WeeklyReportStats;
}

export default function RecommendationsPanel({ stats }: RecommendationsPanelProps) {
  return (
    <div className="space-y-6">
      
      {/* Recommendations List */}
      <div className="space-y-3">
        <h4 className="text-xs font-black text-white/40 uppercase tracking-widest">Recommendations</h4>
        <div className="space-y-3">
          {stats.recommendations.map((rec, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-violet-600/5 border border-violet-500/10 flex items-start gap-3">
              <div className="p-2 bg-violet-600/20 text-violet-400 rounded-lg shrink-0">
                <Sparkles size={14} />
              </div>
              <div>
                <h5 className="text-xs font-black text-violet-400 uppercase tracking-wider">Suggested Change</h5>
                <p className="text-sm text-white/70 font-semibold mt-1">{rec}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Plan */}
      <div className="space-y-3">
        <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
          <Calendar size={14} /> Next Week Action Plan
        </h4>
        <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-3">
          {stats.actionPlan.map((action, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <div className="w-4 h-4 rounded border border-indigo-400/30 flex items-center justify-center text-[10px] font-black text-indigo-400 shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <span className="text-xs text-white/70 font-semibold">{action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quantified outputs from reflections */}
      {stats.problemsSolvedReflections > 0 || stats.learningMinutesReflections > 0 || stats.pagesReadReflections > 0 || stats.featuresShippedReflections > 0 ? (
        <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/5 space-y-3">
          <div className="text-[10px] text-white/30 uppercase tracking-widest font-black">Top Outputs from Focus Reflections</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.problemsSolvedReflections > 0 && (
              <div className="flex flex-col">
                <span className="text-lg font-black text-cyan-400">{stats.problemsSolvedReflections}</span>
                <span className="text-[9px] text-white/40 font-bold uppercase">Problems solved</span>
              </div>
            )}
            {stats.learningMinutesReflections > 0 && (
              <div className="flex flex-col">
                <span className="text-lg font-black text-violet-400">{stats.learningMinutesReflections}m</span>
                <span className="text-[9px] text-white/40 font-bold uppercase">Learning time</span>
              </div>
            )}
            {stats.pagesReadReflections > 0 && (
              <div className="flex flex-col">
                <span className="text-lg font-black text-emerald-400">{stats.pagesReadReflections}</span>
                <span className="text-[9px] text-white/40 font-bold uppercase">Pages read</span>
              </div>
            )}
            {stats.featuresShippedReflections > 0 && (
              <div className="flex flex-col">
                <span className="text-lg font-black text-amber-400">{stats.featuresShippedReflections}</span>
                <span className="text-[9px] text-white/40 font-bold uppercase">Features built</span>
              </div>
            )}
          </div>
        </div>
      ) : null}

    </div>
  );
}
