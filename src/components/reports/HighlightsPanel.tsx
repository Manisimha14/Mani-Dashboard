import React from 'react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import type { WeeklyReportStats } from '../../types/report';

interface HighlightsPanelProps {
  stats: WeeklyReportStats;
}

export default function HighlightsPanel({ stats }: HighlightsPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* Highlights (Wins) */}
      <div className="space-y-3">
        <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
          <CheckCircle2 size={14} /> Highlights
        </h4>
        <div className="space-y-2">
          {stats.wins.map((w, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-2.5">
              <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <span className="text-xs font-semibold text-white/70">{w}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Routine Concerns (Risks) */}
      <div className="space-y-3">
        <h4 className="text-xs font-black text-red-400 uppercase tracking-widest flex items-center gap-1.5">
          <ShieldAlert size={14} /> Concerns
        </h4>
        <div className="space-y-2">
          {stats.risks.map((r, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-red-500/5 border border-red-500/10 flex items-start gap-2.5">
              <ShieldAlert size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
              <span className="text-xs font-semibold text-white/70">{r}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
