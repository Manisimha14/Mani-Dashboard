import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface CognitiveInsightsProps {
  cognitiveInsights: {
    sleepImprovement: number;
    waterCorrelateDrop: number;
    peakHour: number;
    consecutiveLateNights: number;
    hasSleepData: boolean;
    hasWaterData: boolean;
  };
  itemAnim: any;
}

function formatHour(h: number): string {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr   = h % 12 || 12;
  return `${hr} ${ampm}`;
}

const borderClasses: Record<string, string> = {
  violet: 'hover:border-violet-500/20',
  cyan: 'hover:border-cyan-500/20',
  emerald: 'hover:border-emerald-500/20',
  rose: 'hover:border-rose-500/20',
};

const textClasses: Record<string, string> = {
  violet: 'text-violet-400',
  cyan: 'text-cyan-400',
  emerald: 'text-emerald-400',
  rose: 'text-rose-400',
};

export default function CognitiveInsights({
  cognitiveInsights,
  itemAnim,
}: CognitiveInsightsProps) {
  const insightsList = [
    {
      icon: '💤',
      label: 'Sleep & Focus',
      accent: 'violet',
      text: cognitiveInsights.hasSleepData && cognitiveInsights.sleepImprovement > 0 ? (
        <>
          You focus <span className="text-white font-bold">{cognitiveInsights.sleepImprovement}% better</span> on days with <span className="text-white font-bold">&gt;7h sleep</span>.
        </>
      ) : (
        <>Log both focus sessions and sleep duration to track cognitive correlation.</>
      ),
    },
    {
      icon: '💧',
      label: 'Water & Focus',
      accent: 'cyan',
      text: cognitiveInsights.hasWaterData && cognitiveInsights.waterCorrelateDrop > 0 ? (
        <>
          Water below <span className="text-white font-bold">1.5L</span> correlates with <span className="text-white font-bold">{cognitiveInsights.waterCorrelateDrop}% lower completion</span>.
        </>
      ) : (
        <>Log water intake and focus sessions to track hydration impact.</>
      ),
    },
    {
      icon: '⚡',
      label: 'Best Time of Day',
      accent: 'emerald',
      text: (
        <>
          Peak productivity: <span className="text-white font-bold">{formatHour(cognitiveInsights.peakHour)}–{formatHour((cognitiveInsights.peakHour + 2) % 24)}</span>.
        </>
      ),
    },
    {
      icon: '💻',
      label: 'Late-Night Focus',
      accent: 'rose',
      text: cognitiveInsights.consecutiveLateNights > 1 ? (
        <>
          Drops detected after <span className="text-white font-bold">{cognitiveInsights.consecutiveLateNights} consecutive</span> late-night blocks.
        </>
      ) : (
        <>
          Stable sleep hygiene. <span className="text-white font-bold">Late-night boundaries</span> protected.
        </>
      ),
    },
  ];

  return (
    <motion.div variants={itemAnim} className="glass-card p-6">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles size={16} className="text-violet-400" />
        <h3 className="font-bold text-white text-xs uppercase tracking-widest">Activity Insights</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {insightsList.map(ins => {
          const borderClass = borderClasses[ins.accent] || 'hover:border-white/10';
          const textClass = textClasses[ins.accent] || 'text-white';
          return (
            <div
              key={ins.label}
              className={`p-4 rounded-xl bg-white/[0.01] border border-white/5 transition-all ${borderClass}`}
            >
              <div className={`text-[10px] font-black mb-1 uppercase tracking-wider ${textClass}`}>
                {ins.icon} {ins.label}
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed font-medium">{ins.text}</p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
