import React from 'react';
import { format } from 'date-fns';

interface MiniChartProps {
  label: string;
  dataPoints: number[];
  cycleDates: string[];
  colorClass: string;
  unit: string;
}

export default function MiniChart({
  label,
  dataPoints,
  cycleDates,
  colorClass,
  unit
}: MiniChartProps) {
  const maxVal = Math.max(...dataPoints, 1);
  const average = Math.round(dataPoints.reduce((a, b) => a + b, 0) / 7);

  return (
    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/30 uppercase tracking-widest font-black">{label}</span>
        <span className="text-xs text-white/60 font-bold">
          {average} {unit}/day
        </span>
      </div>
      <div className="flex items-end justify-between h-14 gap-2 pt-2" role="figure" aria-label={`Weekly bar chart for ${label}`}>
        {dataPoints.map((val, idx) => {
          const hPct = (val / maxVal) * 100;
          const dayOfWeek = format(new Date(cycleDates[idx] + 'T00:00:00'), 'EEEE');
          return (
            <div 
              key={idx} 
              className="flex-1 flex flex-col items-center gap-1 group/bar relative"
              tabIndex={0}
              role="img"
              aria-label={`${dayOfWeek}: ${val} ${unit}`}
            >
              {/* Floating accessible HTML tooltip */}
              <div className="absolute bottom-full mb-1.5 bg-zinc-900 border border-white/10 text-white text-[9px] font-bold py-1 px-1.5 rounded opacity-0 group-hover/bar:opacity-100 group-focus/bar:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-lg">
                {val} {unit}
              </div>
              <div 
                className={`w-full rounded-t-md transition-all duration-500 ${colorClass}`}
                style={{ height: `${Math.max(10, hPct)}%` }}
              />
              <span className="text-[8px] text-white/20 font-black">
                {format(new Date(cycleDates[idx] + 'T00:00:00'), 'EE').slice(0, 1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
