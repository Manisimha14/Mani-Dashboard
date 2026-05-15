import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import { useAppStore } from '../store/useAppStore';
import { 
  TrendingUp, Clock, Target, Calendar, 
  Zap, Brain, Award, BarChart3, PieChart as PieChartIcon
} from 'lucide-react';
import { format, subDays, startOfDay, isWithinInterval, parseISO } from 'date-fns';

export default function FocusAnalytics() {
  const { focusSessions } = useAppStore();

  const stats = useMemo(() => {
    const completed = focusSessions.filter(s => s.completed);
    const totalMin = completed.reduce((acc, s) => acc + (s.actualDuration || 0), 0);
    const avgScore = completed.length > 0 
      ? Math.round(completed.reduce((acc, s) => acc + (s.productivityScore || 0), 0) / completed.length) 
      : 0;
    const successRate = focusSessions.length > 0 
      ? Math.round((completed.length / focusSessions.length) * 100) 
      : 0;

    // Daily distribution (last 7 days)
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const date = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
      const dayMin = focusSessions
        .filter(s => s.date === date && s.completed)
        .reduce((acc, s) => acc + (s.actualDuration || 0), 0);
      return { day: format(subDays(new Date(), 6 - i), 'EEE'), minutes: dayMin, fullDate: date };
    });

    // Mood distribution
    const moods = completed.reduce((acc: any, s) => {
      if (s.mood) acc[s.mood] = (acc[s.mood] || 0) + 1;
      return acc;
    }, {});
    const moodData = Object.entries(moods).map(([name, value]) => ({ name, value }));

    // Time of day distribution
    const timeSlots = Array.from({ length: 24 }).map((_, i) => ({ hour: i, count: 0 }));
    completed.forEach(s => {
      const hour = new Date(s.startTime).getHours();
      timeSlots[hour].count++;
    });

    // Peak productivity hour
    const peakHour = [...timeSlots].sort((a, b) => b.count - a.count)[0].hour;

    return {
      totalMin,
      avgScore,
      successRate,
      last7Days,
      moodData,
      timeSlots,
      peakHour,
      completedCount: completed.length
    };
  }, [focusSessions]);

  const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'];

  if (focusSessions.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <Brain className="mx-auto text-white/20 mb-4" size={48} />
        <h3 className="text-xl font-bold text-white mb-2">No Focus Data Yet</h3>
        <p className="text-white/40 max-w-sm mx-auto">
          Start your first focus session to see your productivity patterns and insights here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Focus Time', value: `${stats.totalMin}m`, icon: Clock, color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Avg Productivity', value: `${stats.avgScore}%`, icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Success Rate', value: `${stats.successRate}%`, icon: Target, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
          { label: 'Sessions Done', value: stats.completedCount, icon: Award, color: 'text-pink-400', bg: 'bg-pink-500/10' },
        ].map((item, i) => (
          <motion.div 
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-5 flex items-center gap-4"
          >
            <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}>
              <item.icon size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{item.value}</div>
              <div className="text-xs text-white/40">{item.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Activity Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-violet-400" />
              Focus Activity (Last 7 Days)
            </h3>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.last7Days}>
                <defs>
                  <linearGradient id="colorMin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#8b5cf6' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="minutes" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorMin)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Mood Analysis */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <h3 className="font-bold text-white flex items-center gap-2 mb-6">
            <Brain size={18} className="text-pink-400" />
            Mood Distribution
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.moodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.moodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {stats.moodData.map((m, i) => (
              <div key={m.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-[10px] text-white/60 capitalize">{m.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hourly Heatmap */}
        <div className="glass-card p-6">
          <h3 className="font-bold text-white flex items-center gap-2 mb-6">
            <Clock size={18} className="text-cyan-400" />
            Productivity by Hour
          </h3>
          <div className="flex gap-1 h-32 items-end">
            {stats.timeSlots.map(slot => (
              <div 
                key={slot.hour}
                className="flex-1 rounded-t-sm transition-all hover:brightness-125 cursor-help"
                title={`${slot.hour}:00 - ${slot.count} sessions`}
                style={{ 
                  height: `${Math.max(10, (slot.count / (Math.max(...stats.timeSlots.map(s => s.count)) || 1)) * 100)}%`,
                  backgroundColor: slot.count > 0 ? `rgba(139, 92, 246, ${0.2 + (slot.count / 10)})` : 'rgba(255,255,255,0.05)'
                }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-white/30 mt-2">
            <span>12 AM</span>
            <span>12 PM</span>
            <span>11 PM</span>
          </div>
          <p className="text-xs text-white/40 mt-4 text-center">
            You are most active around <span className="text-violet-400 font-bold">{stats.peakHour > 12 ? stats.peakHour - 12 : stats.peakHour} {stats.peakHour >= 12 ? 'PM' : 'AM'}</span>
          </p>
        </div>

        {/* Smart Insights */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white flex items-center gap-2 mb-4">
              <Zap size={18} className="text-yellow-400" />
              Smart Insights
            </h3>
            <div className="space-y-4">
              {stats.avgScore > 80 && (
                <div className="flex gap-3 items-start p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5">
                    <TrendingUp size={14} />
                  </div>
                  <p className="text-sm text-white/70">
                    Your focus quality is excellent! Keep maintaining this high standard of deep work.
                  </p>
                </div>
              )}
              <div className="flex gap-3 items-start p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
                <div className="p-1.5 rounded-lg bg-violet-500/20 text-violet-400 mt-0.5">
                  <Clock size={14} />
                </div>
                <p className="text-sm text-white/70">
                  You tend to be most productive in the {stats.peakHour < 12 ? 'morning' : stats.peakHour < 17 ? 'afternoon' : 'evening'}. Consider scheduling your hardest tasks then.
                </p>
              </div>
              {stats.successRate < 70 && (
                <div className="flex gap-3 items-start p-3 rounded-xl bg-orange-500/5 border border-orange-500/10">
                  <div className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400 mt-0.5">
                    <Target size={14} />
                  </div>
                  <p className="text-sm text-white/70">
                    Try shorter 15-minute sessions to build up your focus stamina and improve your completion rate.
                  </p>
                </div>
              )}
            </div>
          </div>
          <button className="w-full mt-6 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 hover:bg-white/10 transition-all">
            Generate Weekly Report
          </button>
        </div>
      </div>
    </div>
  );
}
