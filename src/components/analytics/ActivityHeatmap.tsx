import React from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';

interface ActivityHeatmapProps {
  heatmapData: { date: string; value: number; label: string }[][];
  setSelectedDate: (d: string | null) => void;
  itemAnim: any;
}

export default function ActivityHeatmap({
  heatmapData,
  setSelectedDate,
  itemAnim,
}: ActivityHeatmapProps) {
  return (
    <motion.div variants={itemAnim} className="glass-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <Target size={16} className="text-violet-400" />
        <h3 className="font-bold text-white text-xs uppercase tracking-widest">Activity Heatmap — Last 12 Weeks</h3>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-2">
        {heatmapData.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map(day => {
              const intensity = Math.min(day.value / 10, 1);
              const bg = day.value === 0
                ? 'rgba(255,255,255,0.04)'
                : `rgba(139,92,246,${0.15 + intensity * 0.85})`;
              return (
                <div
                  key={day.date}
                  title={`${day.label}: ${day.value} activities`}
                  className="w-4 h-4 rounded-sm cursor-pointer transition-transform hover:scale-125"
                  style={{ background: bg }}
                  onClick={() => setSelectedDate(day.date)}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[9px] text-white/20 uppercase">Less</span>
        {[0.04, 0.25, 0.45, 0.65, 0.85].map((o, i) => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{ background: `rgba(139,92,246,${o})` }} />
        ))}
        <span className="text-[9px] text-white/20 uppercase">More</span>
      </div>
    </motion.div>
  );
}
