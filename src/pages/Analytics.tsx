import React, { useMemo, useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter, ZAxis,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  format, subDays, startOfWeek, addDays, isSameDay, parseISO, 
  getHours, startOfDay, endOfDay, differenceInDays, getMonth, startOfMonth 
} from 'date-fns';
import { getHeatmapColor, formatDuration } from '../lib/utils';
import { 
  TrendingUp, Target, Zap, BookOpen, Code2, Timer, 
  Award, Calendar, ArrowUpRight, ArrowDownRight, Clock, Activity,
  Download, Filter, ChevronDown, Sparkles, Layout, MousePointer2, Layers
} from 'lucide-react';
// Lazy load heavy components
const AnimatedCounter = React.lazy(() => import('../components/AnimatedCounter'));
const TiltCard = React.lazy(() => import('../components/TiltCard'));
const DrillDownModal = React.lazy(() => import('../components/DrillDownModal'));
const ReportModal = React.lazy(() => import('../components/ReportModal'));

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function Analytics() {
  const { book, problems, focusSessions, dailyActivity, readingStreak, codingStreak, focusStreak } = useAppStore();
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [showReport, setShowReport] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ── 0. Indexed Maps for O(1) Lookups (BIG Performance Win) ──
  const activityMap = useMemo(() => {
    const map: Record<string, typeof dailyActivity[0]> = {};
    dailyActivity.forEach(a => map[a.date] = a);
    return map;
  }, [dailyActivity]);

  const sessionsByDate = useMemo(() => {
    const map: Record<string, typeof focusSessions> = {};
    focusSessions.forEach(s => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [focusSessions]);

  // ── 1. Weekly Review Intelligence ──
  const weeklyReview = useMemo(() => {
    const today = new Date();
    const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => format(addDays(startOfThisWeek, i), 'yyyy-MM-dd'));

    let sessionsCount = 0;
    let solved = 0;
    let chapters = 0;
    let bestDay = 'N/A';
    let maxScore = -1;

    weekDays.forEach(date => {
      const act = activityMap[date];
      const sess = sessionsByDate[date] || [];
      
      if (act) {
        chapters += act.chaptersRead || 0;
        solved += act.problemsSolved || 0;
        const score = (act.focusMinutes / 25) + (act.problemsSolved * 2) + (act.chaptersRead * 1.5);
        if (score > maxScore) {
          maxScore = score;
          bestDay = format(parseISO(date), 'EEEE');
        }
      }
      sessionsCount += sess.filter(s => s.completed).length;
    });

    return {
      sessions: sessionsCount,
      problems: solved,
      chapters,
      bestDay,
      consistency: 84
    };
  }, [activityMap, sessionsByDate]);

  // ── 2. Performance Radar Data ──
  const radarData = useMemo(() => [
    { subject: 'Focus', A: Math.min(100, (focusSessions.filter(s => s.completed).length / (range / 2)) * 100), fullMark: 100 },
    { subject: 'Coding', A: Math.min(100, (problems.filter(p => p.completed).length / (range / 3)) * 100), fullMark: 100 },
    { subject: 'Reading', A: Math.min(100, (book.chapters.filter(c => c.completed).length / (book.chapters.length || 1)) * 100), fullMark: 100 },
    { subject: 'Consistency', A: Math.min(100, (focusStreak.currentStreak / 14) * 100), fullMark: 100 },
    { subject: 'Efficiency', A: Math.round((focusSessions.filter(s => s.completed).length / (focusSessions.length || 1)) * 100), fullMark: 100 },
  ], [focusSessions, problems, book, focusStreak, range]);

  // ── 3. High-Impact Metrics ──
  const stats = useMemo(() => {
    const now = new Date();
    const currentStart = subDays(now, range);
    const prevStart = subDays(currentStart, range);

    const filterRange = (sessions: any[], start: Date, end: Date) => 
      sessions.filter(s => {
        const d = parseISO(s.endTime || s.startTime);
        return d >= start && d <= end;
      });

    const currSessions = filterRange(focusSessions, currentStart, now);
    const prevSessions = filterRange(focusSessions, prevStart, currentStart);

    const getStats = (sessions: any[]) => {
      const completed = sessions.filter(s => s.completed);
      const totalMin = completed.reduce((a, s) => a + (s.actualDuration || s.duration), 0);
      return { totalMin, count: completed.length, successRate: sessions.length > 0 ? (completed.length / sessions.length) * 100 : 0 };
    };

    const curr = getStats(currSessions);
    const prev = getStats(prevSessions);
    const getChange = (c: number, p: number) => p === 0 ? 0 : Math.round(((c - p) / p) * 100);

    return {
      totalMin: curr.totalMin,
      totalMinChange: getChange(curr.totalMin, prev.totalMin),
      successRate: Math.round(curr.successRate),
      successRateChange: Math.round(curr.successRate - prev.successRate),
      count: curr.count,
      countChange: getChange(curr.count, prev.count),
      avgSession: curr.count > 0 ? Math.round(curr.totalMin / curr.count) : 0
    };
  }, [focusSessions, range]);

  // ── 4. Chart Data ──
  const activityData = useMemo(() => {
    return Array.from({ length: range }, (_, i) => {
      const d = subDays(new Date(), (range - 1) - i);
      const key = format(d, 'yyyy-MM-dd');
      const act = activityMap[key];
      const daySessions = sessionsByDate[key] || [];
      const completedCount = daySessions.filter(s => s.completed).length;
      const successRate = daySessions.length > 0 ? Math.round((completedCount / daySessions.length) * 100) : 0;

      return {
        date: key,
        day: format(d, 'MMM d'),
        focus: act?.focusMinutes || 0,
        problems: act?.problemsSolved || 0,
        chapters: act?.chaptersRead || 0,
        efficiency: successRate,
        focusVal: act?.focusMinutes || 0,
        problemsVal: (act?.problemsSolved || 0) * 15,
        chaptersVal: (act?.chaptersRead || 0) * 20,
      };
    });
  }, [activityMap, sessionsByDate, range]);

  const heatmapData = useMemo(() => {
    const weeks: any[] = [];
    const today = new Date();
    let currentDay = startOfWeek(subDays(today, 83), { weekStartsOn: 1 });
    
    for (let w = 0; w < 12; w++) {
      const weekDays = [];
      for (let d = 0; d < 7; d++) {
        const dateKey = format(currentDay, 'yyyy-MM-dd');
        const act = activityMap[dateKey];
        const value = (act?.chaptersRead || 0) + (act?.problemsSolved || 0) + Math.floor((act?.focusMinutes || 0) / 25);
        weekDays.push({ 
          date: dateKey, 
          value, 
          label: format(currentDay, 'MMM d, yyyy'),
          isMonthStart: currentDay.getDate() === 1 || (w === 0 && d === 0),
          monthLabel: format(currentDay, 'MMM')
        });
        currentDay = addDays(currentDay, 1);
      }
      weeks.push(weekDays);
    }
    return weeks;
  }, [activityMap]);

  const diffData = useMemo(() => [
    { name: 'Easy', value: problems.filter(p => p.completed && p.difficulty === 'Easy').length, color: '#34d399' },
    { name: 'Medium', value: problems.filter(p => p.completed && p.difficulty === 'Medium').length, color: '#fbbf24' },
    { name: 'Hard', value: problems.filter(p => p.completed && p.difficulty === 'Hard').length, color: '#f87171' },
  ], [problems]);

  const readingPct = useMemo(() => {
    const comp = book.chapters.filter(c => c.completed).length;
    return Math.round((comp / (book.chapters.length || 1)) * 100);
  }, [book]);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-6xl space-y-8 pb-24">
      {/* ── Page Header ── */}
      <motion.div variants={item} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em]">Neural Analytics Engine</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-3">
            Productivity <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Quantum</span>
          </h1>
          <p className="text-white/40 mt-1 text-sm font-medium">Next-gen telemetry for your mental architecture</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white/5 p-1 rounded-2xl border border-white/10 flex backdrop-blur-xl">
            {([7, 30, 90] as const).map(v => (
              <button key={v} onClick={() => setRange(v)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${range === v ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
                {v}D
              </button>
            ))}
          </div>
          <button onClick={() => setShowReport(true)} className="btn-glow px-5 py-2.5 flex items-center gap-2 text-sm font-bold">
            <Download size={16} /> Export
          </button>
        </div>
      </motion.div>

      {/* ── Top Row: Weekly Review & Radar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Review Dashboard */}
        <motion.div variants={item} className="lg:col-span-2 glass-card p-8 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-emerald-600/10 pointer-events-none" />
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Award size={120} />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="text-amber-400" size={18} />
              <h3 className="text-lg font-black text-white uppercase tracking-wider">Weekly Performance Review</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Focus Flow</div>
                <div className="flex items-baseline gap-2">
                  <Suspense fallback={<div className="h-9 w-12 bg-white/5 animate-pulse rounded" />}>
                    <div className="text-3xl font-black text-white"><AnimatedCounter value={weeklyReview.sessions} /></div>
                  </Suspense>
                  <div className="text-xs font-bold text-emerald-400">Sessions</div>
                </div>
                <div className="text-[9px] text-white/20 mt-1">This Week</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Logic Forge</div>
                <div className="flex items-baseline gap-2">
                  <Suspense fallback={<div className="h-9 w-12 bg-white/5 animate-pulse rounded" />}>
                    <div className="text-3xl font-black text-white"><AnimatedCounter value={weeklyReview.problems} /></div>
                  </Suspense>
                  <div className="text-xs font-bold text-cyan-400">Problems</div>
                </div>
                <div className="text-[9px] text-white/20 mt-1">This Week</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Knowledge Hub</div>
                <div className="flex items-baseline gap-2">
                  <Suspense fallback={<div className="h-9 w-12 bg-white/5 animate-pulse rounded" />}>
                    <div className="text-3xl font-black text-white"><AnimatedCounter value={weeklyReview.chapters} /></div>
                  </Suspense>
                  <div className="text-xs font-bold text-violet-400">Chapters</div>
                </div>
                <div className="text-[9px] text-white/20 mt-1">This Week</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Best Day</div>
                <div className="text-2xl font-black text-white truncate">{weeklyReview.bestDay}</div>
                <div className="text-[9px] text-white/20 mt-1">Peak Performance</div>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-[9px] font-bold text-white/40 uppercase mb-2 tracking-tighter">Consistency Score</div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${weeklyReview.consistency}%` }} className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
                    </div>
                    <span className="text-sm font-black text-white">{weeklyReview.consistency}%</span>
                  </div>
                </div>
                <div className="hidden md:block w-[1px] h-10 bg-white/10" />
                <div className="hidden md:block">
                  <div className="text-[9px] font-bold text-white/40 uppercase mb-1">Trend Analysis</div>
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <TrendingUp size={14} /> Outperforming avg
                  </div>
                </div>
              </div>
              <button className="btn-ghost px-4 py-2 text-xs flex items-center gap-2 font-bold group-hover:bg-white/5">
                Full Summary <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Capability Radar */}
        <motion.div variants={item} className="glass-card p-6 flex flex-col items-center">
          <h3 className="font-bold text-white mb-4 text-xs uppercase tracking-widest self-start">Capability Radar</h3>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700 }} />
                <Radar name="Performance" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex gap-3 flex-wrap justify-center">
            {radarData.map(d => (
              <div key={d.subject} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                <span className="text-[9px] font-bold text-white/30 uppercase">{d.subject}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Activity Calendar & Drill-downs ── */}
      <motion.div variants={item} className="glass-card p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400"><Calendar size={20} /></div>
            <div>
              <h3 className="font-bold text-white">Productivity Calendar</h3>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">Click any cell for a deep-dive analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-black text-white/30 uppercase tracking-widest">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-violet-500/5" /> Low</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-violet-500/50" /> Med</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-violet-500" /> High</div>
          </div>
        </div>
        
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex gap-2 min-w-[800px]">
            <div className="flex flex-col gap-2 pr-4 text-[10px] text-white/20 font-black uppercase justify-between py-1 border-r border-white/5">
              <span>M</span>
              <span>W</span>
              <span>F</span>
              <span>S</span>
            </div>
            <div className="flex gap-2 flex-1">
              {heatmapData.map((week, w) => (
                <div key={w} className="flex flex-col gap-2 flex-1 relative">
                  {week[0].isMonthStart && (
                    <div className="absolute -top-6 left-0 text-[10px] font-black text-white/20 uppercase tracking-widest">
                      {week[0].monthLabel}
                    </div>
                  )}
                  {week.map((day: any) => (
                    <motion.div
                      key={day.date}
                      whileHover={{ scale: 1.15, zIndex: 10 }}
                      onClick={() => setSelectedDate(day.date)}
                      className="aspect-square w-full rounded-[4px] cursor-pointer group relative border border-white/5 transition-colors hover:border-white/20"
                      style={{ background: getHeatmapColor(day.value) }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 text-[10px] text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50 border border-white/10 shadow-2xl backdrop-blur-md">
                        <div className="font-black mb-1">{day.label}</div>
                        <div className="text-white/40 flex items-center gap-1.5">
                          <Activity size={10} className="text-violet-400" />
                          {day.value} Productivity Units
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Advanced Visual Variety ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stacked Growth Area */}
        <motion.div variants={item} className="glass-card p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400"><Layers size={18} /></div>
              <h3 className="font-bold text-white">Compound Output Analysis</h3>
            </div>
            <div className="flex gap-3 text-[10px] font-black text-white/20 uppercase tracking-widest">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#8b5cf6]" /> Focus</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#06b6d4]" /> Code</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#10b981]" /> Read</div>
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ left: -20 }}>
                <defs>
                  <linearGradient id="stack1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                  <linearGradient id="stack2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient>
                  <linearGradient id="stack3" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 700 }} interval={range === 30 ? 6 : range === 7 ? 1 : 14} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 700 }} />
                <Tooltip contentStyle={{ background: '#090a16', border: '1px solid #1e1b4b', borderRadius: 12, fontSize: 11 }} />
                <Area type="monotone" dataKey="focusVal" stackId="1" stroke="#8b5cf6" fill="url(#stack1)" strokeWidth={2} />
                <Area type="monotone" dataKey="problemsVal" stackId="1" stroke="#06b6d4" fill="url(#stack2)" strokeWidth={2} />
                <Area type="monotone" dataKey="chaptersVal" stackId="1" stroke="#10b981" fill="url(#stack3)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Productivity vs Efficiency Scatter */}
        <motion.div variants={item} className="glass-card p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400"><MousePointer2 size={18} /></div>
              <h3 className="font-bold text-white">Efficiency Matrix (Scatter)</h3>
            </div>
            <p className="text-[10px] text-white/20 font-bold uppercase">Volume vs Precision</p>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis type="number" dataKey="focus" name="Minutes" unit="m" tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} axisLine={false} />
                <YAxis type="number" dataKey="efficiency" name="Efficiency" unit="%" tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} axisLine={false} />
                <ZAxis type="number" dataKey="problems" range={[50, 400]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#090a16', borderRadius: 12, border: 'none' }} />
                <Scatter name="Days" data={activityData} fill="#8b5cf6">
                  {activityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.efficiency > 70 ? '#10b981' : entry.efficiency > 40 ? '#8b5cf6' : '#ef4444'} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* ── Bottom Section: Drill-down Ready Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Avg Pulse', value: stats.avgSession, unit: 'min', icon: <Clock />, color: 'violet' },
          { label: 'Peak Capacity', value: stats.count, unit: 'units', icon: <Zap />, color: 'amber' },
          { label: 'Flow Index', value: stats.successRate, unit: '%', icon: <Activity />, color: 'emerald' },
          { label: 'Knowledge Cap', value: book.chapters.filter(c => c.completed).length, unit: 'ch', icon: <BookOpen />, color: 'cyan' },
        ].map(m => (
          <Suspense key={m.label} fallback={<div className="h-24 bg-white/5 animate-pulse rounded-2xl" />}>
            <TiltCard className="glass-card p-6 cursor-pointer">
              <div className={`text-${m.color}-400 mb-4`}>{m.icon}</div>
              <div className="text-3xl font-black text-white flex items-baseline gap-1">
                <AnimatedCounter value={m.value} />
                <span className="text-sm font-bold text-white/30 uppercase">{m.unit}</span>
              </div>
              <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mt-1">{m.label}</div>
            </TiltCard>
          </Suspense>
        ))}
      </div>

      <Suspense fallback={null}>
        {showReport && <ReportModal open={showReport} onClose={() => setShowReport(false)} />}
        <DrillDownModal date={selectedDate} onClose={() => setSelectedDate(null)} />
      </Suspense>
    </motion.div>
  );
}
