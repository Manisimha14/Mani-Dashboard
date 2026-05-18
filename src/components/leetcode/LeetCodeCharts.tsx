import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface DifficultyDatum {
  name: string;
  value: number;
  color: string;
}

interface TopicDatum {
  topic: string;
  count: number;
}

export default function LeetCodeCharts({
  solvedCount,
  diffData,
  topicData,
}: {
  solvedCount: number;
  diffData: DifficultyDatum[];
  topicData: TopicDatum[];
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="glass-card p-5">
        <h3 className="font-semibold text-white mb-4">Difficulty Breakdown</h3>
        {solvedCount === 0 ? (
          <div className="h-40 flex items-center justify-center text-white/30 text-sm">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={160} minWidth={0}>
            <PieChart>
              <Pie data={diffData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                {diffData.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgba(15,16,28,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'white', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
        <div className="flex justify-center gap-4 mt-2">
          {diffData.map(d => (
            <div key={d.name} className={`flex items-center gap-1.5 text-xs transition-opacity ${d.value === 0 ? 'opacity-25' : 'opacity-100'}`}>
              <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
              <span className="text-white/50">{d.name}: {d.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="font-semibold text-white mb-4">Top Topics</h3>
        {topicData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-white/30 text-sm">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={160} minWidth={0}>
            <BarChart data={topicData} margin={{ top: 0, right: 0, bottom: 20, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="topic" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} angle={-35} textAnchor="end" axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(15,16,28,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'white', fontSize: 12 }} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
