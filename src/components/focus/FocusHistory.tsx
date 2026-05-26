import React from 'react';
import { Calendar } from 'lucide-react';
import type { FocusSession } from '../../types';

interface FocusHistoryProps {
  focusSessions: FocusSession[];
  isFullscreen: boolean;
}

function renderReflection(ref?: string) {
  if (!ref) return null;
  try {
    const parsed = JSON.parse(ref);
    if (parsed && typeof parsed === 'object') {
      const acts = parsed.activities?.join(', ');
      const q = parsed.quality ? `[${parsed.quality}]` : '';
      const quantityTexts: string[] = [];
      if (parsed.quantities) {
        if (parsed.quantities.problemsSolved > 0) quantityTexts.push(`${parsed.quantities.problemsSolved} problems`);
        if (parsed.quantities.pagesRead > 0) quantityTexts.push(`${parsed.quantities.pagesRead} pages`);
        if (parsed.quantities.featuresShipped > 0) quantityTexts.push(`${parsed.quantities.featuresShipped} features`);
        if (parsed.quantities.minutesOfLearning > 0) quantityTexts.push(`${parsed.quantities.minutesOfLearning}m learning`);
      }
      const qtyStr = quantityTexts.length > 0 ? ` • ${quantityTexts.join(', ')}` : '';
      return (
        <div className="text-[10px] text-violet-400 mt-1.5 font-bold italic bg-violet-500/5 py-1.5 px-3 rounded-xl border border-violet-500/10 w-max max-w-full">
          {q} {acts || 'Focused sprint'}{qtyStr}
        </div>
      );
    }
  } catch (e) {
    // Return raw text if not valid JSON
    return (
      <div className="text-[10px] text-violet-400 mt-1.5 font-bold italic bg-violet-500/5 py-1.5 px-3 rounded-xl border border-violet-500/10 w-max max-w-full">
        {ref}
      </div>
    );
  }
  return null;
}

export const FocusHistory = React.memo(function FocusHistory({
  focusSessions,
  isFullscreen,
}: FocusHistoryProps) {
  if (isFullscreen || focusSessions.length === 0) return null;

  return (
    <div className="glass-card p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-white flex items-center gap-2 text-lg">
          <Calendar size={20} className="text-violet-400" />
          Recent Focus History
        </h3>
        <button className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors">View All</button>
      </div>
      <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
        {focusSessions.slice(0, 10).map((s) => (
          <div
            key={s.id}
            className={`flex items-center gap-4 p-4 rounded-2xl transition-all border ${
              s.completed
                ? 'bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10'
                : 'bg-red-500/5 border-red-500/10 hover:bg-red-500/10'
            }`}
          >
            <div className="text-2xl bg-white/5 p-2 rounded-xl">{s.completed ? '🌳' : '🍂'}</div>
            <div className="flex-1">
              <div className="text-sm font-bold text-white">{s.taskName || 'Unnamed Focus Session'}</div>
              <div className="text-[10px] font-medium text-white/30 flex items-center gap-2 mt-0.5">
                <span>{s.date}</span>
                <span className="w-1 h-1 rounded-full bg-white/10" />
                <span>{s.actualDuration || s.duration}m</span>
                {s.mood && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="capitalize">{s.mood}</span>
                  </>
                )}
              </div>
              {renderReflection(s.reflection)}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  s.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {s.completed ? 'Done' : 'Failed'}
              </span>
              {s.productivityScore && (
                <span className="text-[10px] font-bold text-white/40">{s.productivityScore} pts</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
