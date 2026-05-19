import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Clock, Zap, Cpu, AlertCircle, CheckCircle2 } from 'lucide-react';

interface HourlyPerformanceProps {
  focusSessions: any[];
}

const CHART_TOOLTIP_STYLE = {
  background: 'rgba(9,10,22,0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  color: 'white',
  fontSize: 11,
};

export default function HourlyPerformance({ focusSessions }: HourlyPerformanceProps) {
  // Aggregate focus session duration and completion ratios by hour of the day
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${i.toString().padStart(2, '0')}:00`,
      focusMinutes: 0,
      completedCount: 0,
      totalCount: 0,
    }));

    focusSessions.forEach(s => {
      if (!s.startTime) return;
      try {
        const d = new Date(s.startTime);
        const hr = d.getHours();
        if (!isNaN(hr) && hr >= 0 && hr < 24) {
          hours[hr].totalCount++;
          if (s.completed) {
            hours[hr].completedCount++;
            hours[hr].focusMinutes += s.actualDuration || s.duration;
          }
        }
      } catch { /* ignore */ }
    });

    return hours;
  }, [focusSessions]);

  // Compute peak focus windows and interruption vulnerabilities
  const insights = useMemo(() => {
    let peakHour = 9;
    let maxMinutes = 0;
    let highInterruptionHour = -1;
    let maxAbandonedRatio = 0;

    hourlyData.forEach(h => {
      if (h.focusMinutes > maxMinutes) {
        maxMinutes = h.focusMinutes;
        peakHour = h.hour;
      }
      
      const abandoned = h.totalCount - h.completedCount;
      const ratio = h.totalCount > 2 ? abandoned / h.totalCount : 0;
      if (ratio > maxAbandonedRatio) {
        maxAbandonedRatio = ratio;
        highInterruptionHour = h.hour;
      }
    });

    const formatHour = (h: number) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hr = h % 12 || 12;
      return `${hr} ${ampm}`;
    };

    return {
      peakWindow: `${formatHour(peakHour)} - ${formatHour((peakHour + 2) % 24)}`,
      interruptionHour: highInterruptionHour !== -1 ? formatHour(highInterruptionHour) : 'None detected',
      abandonedPct: Math.round(maxAbandonedRatio * 100),
    };
  }, [hourlyData]);

  return (
    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-full">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5">
        <Clock className="text-violet-400" size={16} />
        <div>
          <h3 className="text-lg font-black text-white tracking-tight">Time-of-Day Focus Distribution</h3>
          <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5">Daily focus hours logged by time of day</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        {/* Hourly focus minutes bar chart (takes 2/3 width) */}
        <div className="lg:col-span-2 h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={hourlyData} margin={{ left: -30, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} interval={2} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Bar dataKey="focusMinutes" fill="#8b5cf6" radius={[2, 2, 0, 0]} name="Focus Minutes" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Dynamic hour analytics cards (takes 1/3 width) */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-emerald-400" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Peak Focus Hours</span>
            </div>
            <div className="text-lg font-black text-white font-mono">{insights.peakWindow}</div>
            <span className="text-[9px] text-emerald-400 font-bold">Highest daily focus minutes accumulation</span>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-rose-400" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">High Interruption Hours</span>
            </div>
            <div className="text-lg font-black text-white font-mono">
              {insights.interruptionHour !== 'None detected' ? `${insights.interruptionHour}` : 'None'}
            </div>
            <span className="text-[9px] text-rose-400 font-bold">
              {insights.abandonedPct > 0 ? `${insights.abandonedPct}% focus block abandonment frequency` : 'All sessions safely completed'}
            </span>
          </div>
        </div>
      </div>

      {/* 24-hour visual focus intensity bar */}
      <div className="mt-6 pt-5 border-t border-white/5 space-y-2">
        <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Hourly Focus Intensity</div>
        <div className="flex gap-1.5 h-6">
          {hourlyData.map(h => {
            const intensity = Math.min(h.focusMinutes / 120, 1);
            const bg = h.focusMinutes === 0
              ? 'rgba(255,255,255,0.03)'
              : `rgba(139,92,246,${0.15 + intensity * 0.85})`;
            return (
              <div
                key={h.hour}
                title={`${h.label} — ${h.focusMinutes} focus minutes logged`}
                className="flex-1 rounded-sm cursor-pointer transition-transform hover:scale-110"
                style={{ background: bg }}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[8px] font-mono text-white/20">
          <span>00:00 AM</span>
          <span>12:00 PM</span>
          <span>11:00 PM</span>
        </div>
      </div>
    </div>
  );
}
