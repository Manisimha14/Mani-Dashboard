import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Brain, Clock, ShieldAlert, Award } from 'lucide-react';

interface FocusIntelligenceProps {
  focusSessions: any[];
}

const CHART_TOOLTIP_STYLE = {
  background: 'rgba(9,10,22,0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  color: 'white',
  fontSize: 11,
};

export default function FocusIntelligence({ focusSessions }: FocusIntelligenceProps) {
  // 1. Calculate session success metrics
  const metrics = useMemo(() => {
    const total = focusSessions.length;
    const completed = focusSessions.filter(s => s.completed);
    const completedCount = completed.length;
    const abandonedCount = total - completedCount;
    
    const successRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    
    const durations = completed.map(s => s.actualDuration || s.duration);
    const maxSession = durations.length > 0 ? Math.max(...durations) : 0;
    
    // Average completed focus duration
    const avgDuration = completedCount > 0 
      ? Math.round(durations.reduce((a, b) => a + b, 0) / completedCount) 
      : 0;

    // Categorize session distribution (histogram data)
    let under25 = 0, mins25to45 = 0, mins45to60 = 0, over60 = 0;
    completed.forEach(d => {
      if (d < 25) under25++;
      else if (d <= 45) mins25to45++;
      else if (d <= 60) mins45to60++;
      else over60++;
    });

    const histogram = [
      { name: '<25m', count: under25 },
      { name: '25-45m', count: mins25to45 },
      { name: '45-60m', count: mins45to60 },
      { name: '60m+', count: over60 },
    ];

    const donutData = [
      { name: 'Completed', value: completedCount, color: '#8b5cf6' },
      { name: 'Abandoned', value: abandonedCount, color: 'rgba(255,255,255,0.08)' },
    ];

    return {
      total,
      completedCount,
      abandonedCount,
      successRate,
      maxSession,
      avgDuration,
      histogram,
      donutData,
    };
  }, [focusSessions]);

  return (
    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-full">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5">
        <Brain className="text-violet-400" size={16} />
        <div>
          <h3 className="text-lg font-black text-white tracking-tight">Focus Session Intelligence</h3>
          <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5">Session metrics, histogram & completion rates</p>
        </div>
      </div>

      {/* Numerical Focus Metrics Block */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 text-center">
          <div className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-1">Max Deep Work Block</div>
          <div className="text-xl font-black text-white font-mono">{metrics.maxSession}<span className="text-xs text-white/40">m</span></div>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 text-center">
          <div className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-1">Focus Success Rate</div>
          <div className="text-xl font-black text-white font-mono">{metrics.successRate}%</div>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 text-center">
          <div className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-1">Abandoned Blocks</div>
          <div className="text-xl font-black text-white font-mono">{metrics.abandonedCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 text-center">
          <div className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-1">Avg Success Session</div>
          <div className="text-xl font-black text-white font-mono">{metrics.avgDuration}<span className="text-xs text-white/40">m</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Session completion donut chart */}
        <div className="flex flex-col items-center">
          <div className="h-[140px] w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={metrics.donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={68} paddingAngle={2} dataKey="value">
                  {metrics.donutData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center pointer-events-none">
              <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Rate</span>
              <span className="text-xl font-black text-white font-mono">{metrics.successRate}%</span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-white/40 mt-2">Completion vs Abandoned Ratio</span>
        </div>

        {/* Focus distribution histogram */}
        <div className="h-[140px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.histogram} margin={{ left: -30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="Sessions" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
