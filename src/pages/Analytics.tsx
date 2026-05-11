import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { format, subDays, parseISO, eachDayOfInterval, subMonths } from 'date-fns';
import { getHeatmapColor, formatDuration } from '../lib/utils';
import { TrendingUp, Target, Zap, BookOpen, Code2, Timer, Award } from 'lucide-react';
import ReportModal from '../components/ReportModal';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function Analytics() {
  const { book, problems, focusSessions, dailyActivity, readingStreak, codingStreak, focusStreak } = useAppStore();

  // Last 30 days data
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(new Date(), 29 - i);
    const key = format(d, 'yyyy-MM-dd');
    const act = dailyActivity.find(a => a.date === key);
    return {
      date: key,
      day: format(d, 'MMM d'),
      focus: act?.focusMinutes || 0,
      problems: act?.problemsSolved || 0,
      chapters: act?.chaptersRead || 0,
    };
  });

  // Heatmap: last 12 weeks (84 days)
  const heatmapDays = Array.from({ length: 84 }, (_, i) => {
    const d = subDays(new Date(), 83 - i);
    const key = format(d, 'yyyy-MM-dd');
    const act = dailyActivity.find(a => a.date === key);
    const total = (act?.chaptersRead || 0) + (act?.problemsSolved || 0) + Math.floor((act?.focusMinutes || 0) / 25);
    return { date: key, value: total, day: format(d, 'EEE') };
  });

  // Focus stats
  const totalFocusMin = focusSessions.filter(s => s.completed).reduce((a, s) => a + (s.actualDuration || s.duration), 0);
  const avgSession = focusSessions.filter(s => s.completed).length > 0
    ? Math.round(totalFocusMin / focusSessions.filter(s => s.completed).length)
    : 0;
  const successRate = focusSessions.length > 0
    ? Math.round((focusSessions.filter(s => s.completed).length / focusSessions.length) * 100)
    : 0;

  // LeetCode by difficulty
  const diffData = [
    { name: 'Easy', value: problems.filter(p => p.completed && p.difficulty === 'Easy').length, color: '#34d399' },
    { name: 'Medium', value: problems.filter(p => p.completed && p.difficulty === 'Medium').length, color: '#fbbf24' },
    { name: 'Hard', value: problems.filter(p => p.completed && p.difficulty === 'Hard').length, color: '#f87171' },
  ];

  // Reading progress
  const completedChapters = book.chapters.filter(c => c.completed).length;
  const readingPct = Math.round((completedChapters / 51) * 100);

  const [showReport, setShowReport] = React.useState(false);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-6xl space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-white/40 mt-1 text-sm">Your productivity insights at a glance</p>
        </div>
        <button onClick={() => setShowReport(true)} className="btn-glow px-4 py-2 flex items-center gap-2 text-sm font-semibold">
          📄 Generate Report
        </button>
      </motion.div>

      <ReportModal open={showReport} onClose={() => setShowReport(false)} />

      {/* Key Metrics */}
      <motion.div variants={item} className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Focus Time', value: formatDuration(totalFocusMin), icon: <Timer size={16} />, color: 'violet' },
          { label: 'Success Rate', value: `${successRate}%`, icon: <Target size={16} />, color: 'emerald' },
          { label: 'Avg Session', value: `${avgSession}m`, icon: <Zap size={16} />, color: 'cyan' },
          { label: 'Problems Solved', value: problems.filter(p => p.completed).length, icon: <Code2 size={16} />, color: 'amber' },
        ].map(m => (
          <div key={m.label} className="glass-card p-5">
            <div className={`text-${m.color}-400 mb-2`}>{m.icon}</div>
            <div className="text-2xl font-bold text-white">{m.value}</div>
            <div className="text-xs text-white/40 mt-1">{m.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Activity Heatmap */}
      <motion.div variants={item} className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Activity Heatmap (12 weeks)</h3>
          <div className="flex items-center gap-2 text-xs text-white/30">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map(v => (
              <div key={v} className="w-3 h-3 rounded-sm" style={{ background: getHeatmapColor(v) }} />
            ))}
            <span>More</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(84, minmax(0, 1fr))', minWidth: 700 }}>
            {heatmapDays.map((day, i) => (
              <div
                key={i}
                className="heatmap-cell cursor-pointer group relative"
                style={{ background: getHeatmapColor(day.value) }}
                title={`${day.date}: ${day.value} activities`}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Two Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Focus Trend */}
        <motion.div variants={item} className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4">Daily Focus Minutes (30d)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={last30} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <defs>
                <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(15,16,28,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'white', fontSize: 12 }} />
              <Area type="monotone" dataKey="focus" stroke="#8b5cf6" strokeWidth={2} fill="url(#focusGrad)" name="Focus min" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Problems Trend */}
        <motion.div variants={item} className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4">Problems Solved (30d)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={last30} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(15,16,28,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'white', fontSize: 12 }} />
              <Bar dataKey="problems" fill="#06b6d4" radius={[3, 3, 0, 0]} name="Problems" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Reading + Difficulty Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Reading donut */}
        <motion.div variants={item} className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4">Reading Progress</h3>
          <div className="relative w-36 h-36 mx-auto">
            <svg viewBox="0 0 144 144" className="w-full h-full -rotate-90">
              <circle cx="72" cy="72" r="60" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
              <motion.circle
                cx="72" cy="72" r="60" fill="none"
                stroke="url(#readGrad)" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 60}
                initial={{ strokeDashoffset: 2 * Math.PI * 60 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 60 * (1 - readingPct / 100) }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
              <defs>
                <linearGradient id="readGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-black text-white">{readingPct}%</div>
              <div className="text-xs text-white/30">{completedChapters}/51</div>
            </div>
          </div>
        </motion.div>

        {/* Difficulty donut */}
        <motion.div variants={item} className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4">Difficulty Mix</h3>
          {diffData.every(d => d.value === 0) ? (
            <div className="h-36 flex items-center justify-center text-white/30 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={144}>
              <PieChart>
                <Pie data={diffData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={3}>
                  {diffData.map(d => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'rgba(15,16,28,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'white', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Streak Summary */}
        <motion.div variants={item} className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4">Best Streaks</h3>
          <div className="space-y-3">
            {[
              { label: 'Reading', current: readingStreak.currentStreak, best: readingStreak.longestStreak, color: 'text-violet-400' },
              { label: 'Coding', current: codingStreak.currentStreak, best: codingStreak.longestStreak, color: 'text-cyan-400' },
              { label: 'Focus', current: focusStreak.currentStreak, best: focusStreak.longestStreak, color: 'text-emerald-400' },
            ].map(s => (
              <div key={s.label}>
                <div className="flex justify-between text-xs text-white/40 mb-1">
                  <span>{s.label}</span>
                  <span>{s.current}d current / {s.best}d best</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${s.best > 0 ? (s.current / s.best) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
