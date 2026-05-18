import React from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Heart, Droplets, Dumbbell, Moon } from 'lucide-react';

const CHART_TOOLTIP_STYLE = {
  background: 'rgba(9,10,22,0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  color: 'white',
  fontSize: 11,
};

interface BiometricPoint {
  date: string;
  day: string;
  water: number;
  calories: number;
  protein: number;
  workoutMin: number;
  workoutCal: number;
  sleepHrs: number;
}

interface AnalyticsHealthChartsProps {
  biometricStats: {
    avgWaterL: string;
    avgCalories: number;
    avgWorkoutMin: number;
    avgSleepHrs: string;
    totalWorkouts: number;
  };
  biometricActivityData: BiometricPoint[];
  variant: 'breakdown' | 'series';
}

function BioChart({
  title, icon, legend, children,
}: {
  title: string;
  icon: React.ReactNode;
  legend: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="font-bold text-white">{title}</h3>
        </div>
        <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">{legend}</span>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function AnalyticsHealthCharts({
  biometricStats,
  biometricActivityData,
  variant,
}: AnalyticsHealthChartsProps) {
  if (variant === 'breakdown') {
    return (
      <div className="glass-card p-6 flex flex-col items-center">
        <h3 className="font-bold text-white mb-4 text-xs uppercase tracking-widest self-start">Health Breakdown</h3>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
              { subject: 'Calories', A: Math.min(100, (biometricStats.avgCalories / 2100) * 100) },
              { subject: 'Water', A: Math.min(100, (Number(biometricStats.avgWaterL) / 3.5) * 100) },
              { subject: 'Exercise', A: Math.min(100, (biometricStats.avgWorkoutMin / 45) * 100) },
              { subject: 'Sleep', A: Math.min(100, (Number(biometricStats.avgSleepHrs) / 8) * 100) },
              { subject: 'Workouts', A: Math.min(100, (biometricStats.totalWorkouts / 4) * 100) },
            ]}>
              <PolarGrid stroke="rgba(255,255,255,0.05)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700 }} />
              <Radar name="Wellness" dataKey="A" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <BioChart title="Water Intake" icon={<div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400"><Droplets size={18} /></div>} legend="Logged Water (ml)">
        <AreaChart data={biometricActivityData} margin={{ left: -20 }}>
          <defs>
            <linearGradient id="gWaterIntake" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} />
          <Tooltip contentStyle={{ ...CHART_TOOLTIP_STYLE, border: '1px solid #0891b2' }} />
          <Area type="monotone" dataKey="water" stroke="#06b6d4" fill="url(#gWaterIntake)" strokeWidth={2} />
        </AreaChart>
      </BioChart>

      <BioChart title="Calories" icon={<div className="p-2 rounded-lg bg-rose-500/10 text-rose-400"><Heart size={18} /></div>} legend="Consumed (kcal)">
        <BarChart data={biometricActivityData} margin={{ left: -20 }}>
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Bar dataKey="calories" fill="#f43f5e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </BioChart>

      <BioChart title="Workouts" icon={<div className="p-2 rounded-lg bg-violet-500/10 text-violet-400"><Dumbbell size={18} /></div>} legend="Active Mins">
        <AreaChart data={biometricActivityData} margin={{ left: -20 }}>
          <defs>
            <linearGradient id="gWorkoutActive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Area type="monotone" dataKey="workoutMin" stroke="#8b5cf6" fill="url(#gWorkoutActive)" strokeWidth={2} />
        </AreaChart>
      </BioChart>

      <BioChart title="Sleep" icon={<div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400"><Moon size={18} /></div>} legend="Hours">
        <BarChart data={biometricActivityData} margin={{ left: -20 }}>
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Bar dataKey="sleepHrs" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </BioChart>
    </div>
  );
}
