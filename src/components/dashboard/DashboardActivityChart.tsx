import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface ActivityPoint {
  day: string;
  focus: number;
  problems: number;
  chapters: number;
}

export default function DashboardActivityChart({ data }: { data: ActivityPoint[] }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Weekly Activity</h3>
        <span className="text-xs text-white/30">Last 7 days</span>
      </div>
      <ResponsiveContainer width="100%" height={180} minWidth={0}>
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: 'rgba(15,16,28,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: 'white', fontSize: 12 }}
            cursor={{ stroke: 'rgba(139,92,246,0.3)' }}
          />
          <Line type="monotone" dataKey="focus" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Focus (min)" />
          <Line type="monotone" dataKey="problems" stroke="#06b6d4" strokeWidth={2} dot={false} name="Problems" />
          <Line type="monotone" dataKey="chapters" stroke="#10b981" strokeWidth={2} dot={false} name="Chapters" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
