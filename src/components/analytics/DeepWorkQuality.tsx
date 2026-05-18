import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar, Tooltip } from 'recharts';
import { Target, ShieldAlert, Award, Clock } from 'lucide-react';

interface DeepWorkQualityProps {
  focusSessions: any[];
}

const CHART_TOOLTIP_STYLE = {
  background: 'rgba(9,10,22,0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  color: 'white',
  fontSize: 11,
};

export default function DeepWorkQuality({ focusSessions }: DeepWorkQualityProps) {
  const analytics = useMemo(() => {
    let deepFlowMin = 0, highOutputMin = 0, maintenanceMin = 0;
    let deepCount = 0, highCount = 0, maintenanceCount = 0;
    
    const completed = focusSessions.filter(s => s.completed);
    const totalCount = focusSessions.length;
    const completedCount = completed.length;

    completed.forEach(s => {
      const d = s.actualDuration || s.duration;
      if (d >= 60) {
        deepFlowMin += d;
        deepCount++;
      } else if (d >= 30) {
        highOutputMin += d;
        highCount++;
      } else {
        maintenanceMin += d;
        maintenanceCount++;
      }
    });

    const totalMin = Math.max(1, deepFlowMin + highOutputMin + maintenanceMin);
    
    // Focus fragmentation: Ratio of short sessions (<30 min) vs total completed
    const fragmentationScore = completedCount > 0 
      ? Math.round((maintenanceCount / completedCount) * 100) 
      : 0;

    // Attention Stability: Percentage of completed sessions vs total attempts
    const stabilityScore = totalCount > 0 
      ? Math.round((completedCount / totalCount) * 100) 
      : 0;

    // Distraction susceptibility: Percentage of abandoned sessions
    const distractionMetric = totalCount > 0 
      ? Math.round(((totalCount - completedCount) / totalCount) * 100) 
      : 0;

    const donutData = [
      { name: 'Deep Work (>60m)', value: deepFlowMin, percentage: Math.round((deepFlowMin / totalMin) * 100), color: '#8b5cf6' },
      { name: 'High Output (30-60m)', value: highOutputMin, percentage: Math.round((highOutputMin / totalMin) * 100), color: '#06b6d4' },
      { name: 'Short Session (<30m)', value: maintenanceMin, percentage: Math.round((maintenanceMin / totalMin) * 100), color: '#10b981' },
    ];

    const radialData = [
      { name: 'Attention Stability', value: stabilityScore, fill: '#8b5cf6' },
      { name: 'Fragmentation Index', value: 100 - fragmentationScore, fill: '#06b6d4' },
      { name: 'Focus Resilience', value: 100 - distractionMetric, fill: '#10b981' },
    ];

    return {
      fragmentationScore,
      stabilityScore,
      distractionMetric,
      donutData,
      radialData,
      totalMin,
    };
  }, [focusSessions]);

  return (
    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-full">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5">
        <Target className="text-emerald-400" size={16} />
        <div>
          <h3 className="text-lg font-black text-white tracking-tight">Deep Work Quality Analysis</h3>
          <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5">Focus fragmentation, attention stability & resilience</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Core Ratios Donut Chart */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="h-[140px] w-full md:w-[140px] relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie data={analytics.donutData} cx="50%" cy="50%" innerRadius={48} outerRadius={65} paddingAngle={2} dataKey="value">
                  {analytics.donutData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center pointer-events-none">
              <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Minutes</span>
              <span className="text-lg font-black text-white font-mono">{analytics.totalMin}<span className="text-xs text-white/40">m</span></span>
            </div>
          </div>
          <div className="space-y-2 flex-1">
            {analytics.donutData.map(f => (
              <div key={f.name} className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: f.color }} />
                  <span className="text-white/60 font-bold">{f.name}</span>
                </div>
                <span className="text-white font-mono font-black">{f.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quality indices & radial chart */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-[10px]">
              <span className="text-white/60 font-bold">Attention Stability Score</span>
              <span className="text-emerald-400 font-mono font-black">{analytics.stabilityScore}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full" style={{ width: `${analytics.stabilityScore}%` }} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[10px]">
              <span className="text-white/60 font-bold">Focus Fragmentation Index</span>
              <span className="text-cyan-400 font-mono font-black">{analytics.fragmentationScore}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${analytics.fragmentationScore}%` }} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[10px]">
              <span className="text-white/60 font-bold">Distraction Susceptibility</span>
              <span className="text-rose-400 font-mono font-black">{analytics.distractionMetric}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500 rounded-full" style={{ width: `${analytics.distractionMetric}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
