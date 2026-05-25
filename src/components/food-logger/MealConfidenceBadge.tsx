import React from 'react';
import { Check, Info, AlertTriangle } from 'lucide-react';

type MealConfidenceBadgeProps = {
  confidence: 'high' | 'medium' | 'low';
};

export function MealConfidenceBadge({ confidence }: MealConfidenceBadgeProps) {
  const getConfidenceColor = (conf: string) => {
    switch (conf) {
      case 'high': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20 shadow-[0_0_12px_rgba(52,211,153,0.05)]';
      case 'medium': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'low': return 'text-rose-400 bg-rose-400/10 border-rose-400/20 shadow-[0_0_12px_rgba(251,113,133,0.05)]';
      default: return 'text-zinc-400 bg-zinc-800 border-zinc-700';
    }
  };

  return (
    <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border tracking-wider uppercase transition-all duration-300 ${getConfidenceColor(confidence)}`}>
      {confidence === 'high' && <Check size={13} />}
      {confidence === 'medium' && <Info size={13} />}
      {confidence === 'low' && <AlertTriangle size={13} />}
      <span>{confidence} CONFIDENCE</span>
    </div>
  );
}
