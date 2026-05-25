import React from 'react';
import type { ParsedMealData } from '../../hooks/useFoodLogger';

type NutritionSummaryProps = {
  data: ParsedMealData;
};

export function NutritionSummary({ data }: NutritionSummaryProps) {
  const baseCalories = data.totals.calories;
  const lowerRange = Math.round(baseCalories * 0.85);
  const upperRange = Math.round(baseCalories * 1.15);
  const showRange = data.confidence !== 'high' && baseCalories > 0;

  // Curate dynamic macro percentage for high contrast progress indicator
  const totalGrams = data.totals.protein + data.totals.carbs + data.totals.fat || 1;
  const pPct = Math.round((data.totals.protein / totalGrams) * 100);
  const cPct = Math.round((data.totals.carbs / totalGrams) * 100);
  const fPct = Math.round((data.totals.fat / totalGrams) * 100);

  return (
    <div className="bg-zinc-950/50 rounded-2xl p-5 mb-6 border border-zinc-800/50 shadow-inner">
      <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Nutrition Summary</h4>
      
      {/* Visual Macro Proportion Bar */}
      <div className="h-2.5 bg-zinc-900 rounded-full overflow-hidden mb-5 flex border border-zinc-800/40">
        <div className="h-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]" style={{ width: `${pPct}%` }} title={`Protein: ${pPct}%`} />
        <div className="h-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.4)]" style={{ width: `${cPct}%` }} title={`Carbs: ${cPct}%`} />
        <div className="h-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.4)]" style={{ width: `${fPct}%` }} title={`Fat: ${fPct}%`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-left">
        <div className="flex flex-col">
          <span className="text-2xl font-black text-white tracking-tight">
            {showRange ? `${lowerRange}–${upperRange}` : Math.round(baseCalories)}
          </span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">
            {showRange ? 'kcal (est. range)' : 'kcal'}
          </span>
        </div>
        <div className="flex flex-col border-l border-zinc-800/50 pl-3">
          <span className="text-xl font-bold text-cyan-400">{Math.round(data.totals.protein)}g</span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Protein</span>
        </div>
        <div className="flex flex-col border-l border-zinc-800/50 pl-3">
          <span className="text-xl font-bold text-purple-400">{Math.round(data.totals.carbs)}g</span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Carbs</span>
        </div>
        <div className="flex flex-col border-l border-zinc-800/50 pl-3">
          <span className="text-xl font-bold text-rose-400">{Math.round(data.totals.fat)}g</span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Fat</span>
        </div>
        <div className="flex flex-col border-l border-zinc-800/50 pl-3">
          <span className="text-xl font-bold text-emerald-400">{Math.round(data.totals.fiber)}g</span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Fiber</span>
        </div>
      </div>
    </div>
  );
}
