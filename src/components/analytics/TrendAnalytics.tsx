import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Activity, Clock, Zap, Cpu } from 'lucide-react';

interface TrendAnalyticsProps {
  activityData: any[];
}

const CHART_TOOLTIP_STYLE = {
  background: 'rgba(9,10,22,0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  color: 'white',
  fontSize: 11,
};

export default function TrendAnalytics({ activityData }: TrendAnalyticsProps) {
  const [activeChart, setActiveChart] = useState<'composed' | 'area' | 'rolling'>('composed');

  // Compute rolling averages (3-day moving average of focus minutes)
  const computedData = useMemo(() => {
    return activityData.map((d, index) => {
      let rollingSum = 0;
      let count = 0;
      for (let i = Math.max(0, index - 2); i <= index; i++) {
        rollingSum += activityData[i].focus;
        count++;
      }
      const rollingAvg = count > 0 ? Math.round(rollingSum / count) : 0;
      return {
        ...d,
        rollingAvg,
        productivityScore: Math.min(100, Math.round((d.focus / 60) * 40 + (d.problems * 20) + (d.chapters * 15))),
      };
    });
  }, [activityData]);

  return (
    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="text-violet-400" size={16} />
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">time_series_analytics</span>
          </div>
          <h3 className="text-lg font-black text-white tracking-tight">Productivity Trend Analytics</h3>
        </div>

        {/* Tab Controls for High-Density Switches */}
        <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex">
          {([
            { id: 'composed', label: 'Multi-Axis' },
            { id: 'area', label: 'Productivity Index' },
            { id: 'rolling', label: 'Moving Baseline' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveChart(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                activeChart === tab.id
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full min-h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          {activeChart === 'composed' ? (
            <ComposedChart data={computedData} margin={{ left: -20, right: 10 }}>
              <defs>
                <linearGradient id="gFocusComposed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} label={{ value: 'Focus (min)', angle: -90, position: 'insideLeft', offset: 10, fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 700 }} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} label={{ value: 'Solved Exercises', angle: 90, position: 'insideRight', offset: 10, fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 700 }} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Bar yAxisId="left" dataKey="focus" fill="url(#gFocusComposed)" radius={[4, 4, 0, 0]} name="Focus Minutes" />
              <Line yAxisId="right" type="monotone" dataKey="problems" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4', r: 3 }} name="Problems Solved" />
              <Line yAxisId="right" type="monotone" dataKey="chapters" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} name="Chapters Read" />
            </ComposedChart>
          ) : activeChart === 'area' ? (
            <AreaChart data={computedData} margin={{ left: -20, right: 10 }}>
              <defs>
                <linearGradient id="gProductivityIdx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="productivityScore" stroke="#ec4899" fill="url(#gProductivityIdx)" strokeWidth={2} name="Productivity Index" />
            </AreaChart>
          ) : (
            <ComposedChart data={computedData} margin={{ left: -20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Bar dataKey="focus" fill="rgba(255,255,255,0.04)" radius={[4, 4, 0, 0]} name="Raw Focus Time" />
              <Line type="monotone" dataKey="rollingAvg" stroke="#8b5cf6" strokeWidth={2.5} dot={false} name="3D Rolling Average" />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="w-full flex items-center justify-between pt-4 mt-4 border-t border-white/5 text-[9px] font-mono text-white/30">
        <span className="flex items-center gap-1"><Activity size={10} className="text-violet-400" /> BASELINE STATS</span>
        <span className="text-violet-400 font-bold uppercase">Time-Series Trend Active</span>
      </div>
    </div>
  );
}
