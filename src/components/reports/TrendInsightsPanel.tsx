import React from 'react';
import { TrendingUp } from 'lucide-react';
import MiniChart from './MiniChart';
import type { WeeklyReportStats } from '../../types/report';

interface TrendInsightsPanelProps {
  stats: WeeklyReportStats;
  cycleDates: string[];
}

export default function TrendInsightsPanel({
  stats,
  cycleDates
}: TrendInsightsPanelProps) {
  return (
    <div className="space-y-6">
      
      {/* Sparkline Daily Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MiniChart 
          label="Focus Minutes Trend" 
          dataPoints={stats.focusChartData} 
          cycleDates={cycleDates} 
          colorClass="bg-violet-500" 
          unit="min" 
        />
        <MiniChart 
          label="Coding Activity Trend" 
          dataPoints={stats.codingChartData} 
          cycleDates={cycleDates} 
          colorClass="bg-cyan-500" 
          unit="solved" 
        />
        <MiniChart 
          label="Hydration Volumes" 
          dataPoints={stats.waterChartData} 
          cycleDates={cycleDates} 
          colorClass="bg-blue-500" 
          unit="ml" 
        />
        <MiniChart 
          label="Sleep Duration" 
          dataPoints={stats.sleepChartData} 
          cycleDates={cycleDates} 
          colorClass="bg-pink-500" 
          unit="min" 
        />
      </div>

      {/* Correlation list */}
      <div className="space-y-3">
        <h4 className="text-xs font-black text-white/40 uppercase tracking-widest">Real-time Trend Insights</h4>
        <div className="space-y-3">
          {stats.correlationInsights.map((insight, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3">
              <div className="p-2 bg-cyan-600/10 text-cyan-400 rounded-lg shrink-0">
                <TrendingUp size={14} />
              </div>
              <div>
                <h5 className="text-xs font-black text-cyan-400 uppercase tracking-wider">Trend Insight</h5>
                <p className="text-sm text-white/70 font-semibold mt-1">{insight}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
