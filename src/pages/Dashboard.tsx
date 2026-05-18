import React, { Suspense, lazy } from 'react';
import { motion, type Variants } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useBook } from '../hooks/useBookQuery';
import { useProblems } from '../hooks/useLeetCodeQuery';
import { useFocusSessions } from '../hooks/useFocusQuery';
import { useProfile } from '../hooks/useProfileQuery';
import { useAchievements } from '../hooks/useAchievementQuery';
import { useDailyActivity } from '../hooks/useActivityQuery';
import { useTrackers } from '../hooks/useTrackerQuery';
import { useTodayHealthData, useHealthGoals, useAddWater, useAddWorkout } from '../hooks/useHealthQuery';
import { useSoundFX } from '../hooks/useSoundFX';
import {
  BookOpen, Code2, Timer, Flame, Trophy, TrendingUp,
  Target, Zap, ChevronRight, Star, CheckCircle2, Clock, Sparkles, BarChart3,
  Heart, Droplets, Dumbbell, Moon, Plus
} from 'lucide-react';
import { formatDuration, todayString, getProductivityScore } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PRODUCTIVITY_QUOTES } from '../lib/data';
import TiltCard from '../components/TiltCard';
import Skeleton, { StatCardSkeleton, InsightSkeleton } from '../components/Skeleton';
import MissionControl from '../components/MissionControl';
import QuickLauncher from '../components/QuickLauncher';
import { useMemo } from 'react';
import DeferredOnVisible from '../components/DeferredOnVisible';
import FinanceWidget from '../components/dashboard/FinanceWidget';

const ProductivityInsights = lazy(() => import('../components/ProductivityInsights'));
const CognitiveCockpit = lazy(() => import('../components/CognitiveCockpit'));
const DashboardActivityChart = lazy(() => import('../components/dashboard/DashboardActivityChart'));

const stagger: Variants = {
  hidden: { opacity: 0 },
  show: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.1,
      delayChildren: 0.2
    } 
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: 'spring',
      damping: 20,
      stiffness: 100
    } 
  },
};

export default function Dashboard() {
  const { data: book = { id: 'main-book', title: 'My Book', author: 'Author', chapters: [], startDate: todayString(), coverColor: '#7c3aed' } } = useBook();
  const { data: problems = [] } = useProblems();
  const { data: focusSessions = [] } = useFocusSessions();
  const { data: profile } = useProfile();
  const { data: achievements = [] } = useAchievements();
  const { data: dailyActivity = [] } = useDailyActivity();
  const { data: trackers = [] } = useTrackers();

  const todayHealth = useTodayHealthData();
  const { data: healthGoals = [] } = useHealthGoals();
  const addWater = useAddWater();
  const addWorkout = useAddWorkout();
  const { play } = useSoundFX();

  const readingStreak = profile?.readingStreak ?? { currentStreak: 0, longestStreak: 0, history: {} };
  const codingStreak = profile?.codingStreak ?? { currentStreak: 0, longestStreak: 0, history: {} };
  const focusStreak = profile?.focusStreak ?? { currentStreak: 0, longestStreak: 0, history: {} };
  const userSettings = profile?.settings ?? { name: '', theme: 'dark', accentColor: '#7c3aed' };
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Immediate load if data is ready, but keep a tiny gap for mount animations
    const timer = setTimeout(() => setLoading(false), 50);
    return () => clearTimeout(timer);
  }, []);

  const today = todayString();
  
  const {
    chaptersToday,
    problemsToday,
    focusMinutesToday,
    completedChapters,
    completedSessions,
    totalFocusMin,
    progressPct,
    prodScore
  } = useMemo(() => {
    const chaptersToday = book.chapters.filter(c => c.completed && c.dateCompleted === today).length;
    const problemsToday = problems.filter(p => p.completed && p.date === today).length;
    const focusMinutesToday = focusSessions.filter(s => s.completed && s.date === today).reduce((acc, s) => acc + (s.actualDuration || s.duration), 0);

    const completedChapters = book.chapters.filter(c => c.completed).length;
    const completedSessions = focusSessions.filter(s => s.completed).length;
    const totalFocusMin = focusSessions.filter(s => s.completed).reduce((a, s) => a + (s.actualDuration || s.duration), 0);
    const progressPct = Math.round((completedChapters / Math.max(1, book.chapters.length)) * 100);
    const prodScore = getProductivityScore(chaptersToday, problemsToday, focusMinutesToday);

    return {
      chaptersToday,
      problemsToday,
      focusMinutesToday,
      completedChapters,
      completedSessions,
      totalFocusMin,
      progressPct,
      prodScore
    };
  }, [book.chapters, problems, focusSessions, today]);

  const nextChapter = book.chapters.find(c => !c.completed);
  const recentAchievements = useMemo(() => achievements.filter(a => a.unlocked).slice(0, 3), [achievements]);
  
  const rawQuote = PRODUCTIVITY_QUOTES[new Date().getDay() % PRODUCTIVITY_QUOTES.length];
  const [quoteText, quoteAuthor] = rawQuote.includes('—') 
    ? rawQuote.split('—').map(s => s.trim()) 
    : [rawQuote, 'Unknown'];

  // Last 7 days activity
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = format(d, 'yyyy-MM-dd');
    const act = dailyActivity.find(a => a.date === key);
    return {
      day: format(d, 'EEE'),
      focus: act?.focusMinutes || 0,
      problems: act?.problemsSolved || 0,
      chapters: act?.chaptersRead || 0,
    };
  });

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 max-w-7xl pb-12">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
            {userSettings.name ? `Hey, ${userSettings.name}` : 'Dashboard'}
            <motion.span
              animate={{ rotate: [0, 20, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              👋
            </motion.span>
          </h1>
          <p className="text-white/40 font-medium flex items-center gap-2">
            <Clock size={14} className="text-violet-400" />
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="glass-card px-5 py-3 flex items-center gap-3 text-sm text-white/70 italic border-white/10 shadow-xl max-w-md w-full md:w-auto bg-white/[0.02]"
        >
          <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
            <Star size={16} className="text-violet-400" />
          </div>
          <div className="flex flex-col">
            <span className="line-clamp-1 leading-relaxed text-sm font-medium">"{quoteText}"</span>
            <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">— {quoteAuthor}</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Productivity Score Banner */}
      <motion.div variants={item}>
        <TiltCard>
          <div className="glass-card p-8 relative overflow-hidden group">
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
              initial={{ x: '-100%' }}
              whileHover={{ 
                x: '100%',
                transition: { duration: 0.8, ease: "easeInOut" }
              }}
            />
            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-black">Live Productivity Status</div>
                </div>
                <div className="flex items-end gap-3">
                  <motion.span 
                    key={prodScore}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-7xl font-black text-gradient"
                  >
                    {prodScore}
                  </motion.span>
                  <span className="text-white/20 mb-3 text-2xl font-bold">/ 100</span>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 w-max ${
                    prodScore >= 70 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    prodScore >= 40 ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' :
                    'bg-white/5 text-white/30 border border-white/10'
                  }`}>
                    {prodScore === 0 ? "Quiet Start" : prodScore < 40 ? "Building Momentum" : prodScore < 70 ? "Peak Flow" : "God Mode"}
                  </div>
                  <p className="text-sm text-white/50 font-medium italic">
                    {prodScore === 0 && "Your forest awaits its first seed today..."}
                    {prodScore > 0 && prodScore < 40 && "You're warming up. Stay consistent."}
                    {prodScore >= 40 && prodScore < 70 && "You've entered the flow state!"}
                    {prodScore >= 70 && "Maximum efficiency achieved. Legend."}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 md:gap-6 w-full lg:w-auto">
                <ScorePill 
                  icon={<BookOpen size={18} />} 
                  label="Library" 
                  value={chaptersToday} 
                  color="violet" 
                  subText={`${progressPct}% done`}
                />
                <ScorePill icon={<Code2 size={18} />} label="Coding" value={problemsToday} color="cyan" />
                <ScorePill icon={<Timer size={18} />} label="Focus" value={focusMinutesToday} color="emerald" />
              </div>
            </div>
          </div>
        </TiltCard>
      </motion.div>

      {/* Contextual Awareness */}
      <motion.div variants={item}>
        <Suspense fallback={null}>
          <CognitiveCockpit />
        </Suspense>
      </motion.div>

      {/* Productivity Insights */}
      <motion.div variants={item}>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InsightSkeleton />
            <InsightSkeleton />
          </div>
        ) : (
          <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-2 gap-4"><InsightSkeleton /><InsightSkeleton /></div>}>
            <ProductivityInsights />
          </Suspense>
        )}
      </motion.div>

      {/* Streak Row */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <TiltCard><StreakCard label="Reading Streak" streak={readingStreak.currentStreak} longest={readingStreak.longestStreak} color="violet" icon={<BookOpen size={20} />} /></TiltCard>
            <TiltCard><StreakCard label="Coding Streak" streak={codingStreak.currentStreak} longest={codingStreak.longestStreak} color="cyan" icon={<Code2 size={20} />} /></TiltCard>
            <TiltCard><StreakCard label="Focus Streak" streak={focusStreak.currentStreak} longest={focusStreak.longestStreak} color="emerald" icon={<Timer size={20} />} /></TiltCard>
          </>
        )}
      </motion.div>

      {/* Immersive Health Vitals Console */}
      <motion.div variants={item} className="glass-card p-6 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/[0.03] via-transparent to-cyan-500/[0.03] pointer-events-none" />
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Heart size={20} className="animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Health Overview</h3>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5">Today's health overview</p>
            </div>
          </div>
          <button onClick={() => navigate('/health')} className="btn-ghost px-3 py-1.5 text-xs font-bold flex items-center gap-1 hover:bg-white/5">
            Log Vitals <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Calorie Card */}
          <div className="relative p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between min-h-[140px] group/card hover:border-rose-500/30 transition-all duration-300">
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                <Flame size={16} />
              </div>
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">Calories</span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">{todayHealth.totalCalories}</span>
                <span className="text-xs text-white/40">/ {healthGoals.find(g => g.type === 'calories')?.targetValue ?? 2100} kcal</span>
              </div>
              <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((todayHealth.totalCalories / (healthGoals.find(g => g.type === 'calories')?.targetValue ?? 2100)) * 100, 100)}%` }}
                  className="h-full bg-gradient-to-r from-rose-500 to-pink-500"
                />
              </div>
            </div>
          </div>

          {/* Hydration Card */}
          <div className="relative p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between min-h-[140px] group/card hover:border-cyan-500/30 transition-all duration-300">
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Droplets size={16} />
              </div>
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">Hydration</span>
            </div>
            <div>
              <div className="flex items-baseline gap-1 mt-4">
                <span className="text-2xl font-black text-white">{(todayHealth.totalWaterMl / 1000).toFixed(1)}L</span>
                <span className="text-xs text-white/40">/ {(healthGoals.find(g => g.type === 'water')?.targetValue ?? 3500) / 1000}L</span>
              </div>
              <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((todayHealth.totalWaterMl / (healthGoals.find(g => g.type === 'water')?.targetValue ?? 3500)) * 100, 100)}%` }}
                  className="h-full bg-gradient-to-r from-cyan-400 to-sky-500"
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button 
                onClick={() => {
                  play('success');
                  addWater.mutate({ date: today, time: new Date().toTimeString().slice(0, 5), amount: 250 });
                }}
                className="flex-1 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold text-cyan-400 hover:bg-cyan-500/20 transition-all active:scale-95"
              >
                +250ml
              </button>
              <button 
                onClick={() => {
                  play('success');
                  addWater.mutate({ date: today, time: new Date().toTimeString().slice(0, 5), amount: 500 });
                }}
                className="flex-1 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold text-cyan-400 hover:bg-cyan-500/20 transition-all active:scale-95"
              >
                +500ml
              </button>
            </div>
          </div>

          {/* Workout Card */}
          <div className="relative p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between min-h-[140px] group/card hover:border-violet-500/30 transition-all duration-300">
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                <Dumbbell size={16} />
              </div>
              <span className="text-[10px] font-black text-violet-400 uppercase tracking-wider bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">Workouts</span>
            </div>
            <div>
              <div className="flex items-baseline gap-1 mt-4">
                <span className="text-2xl font-black text-white">{todayHealth.totalWorkoutMinutes}m</span>
                <span className="text-xs text-white/40">/ {healthGoals.find(g => g.type === 'workouts_per_week')?.targetValue ?? 45} min</span>
              </div>
              <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((todayHealth.totalWorkoutMinutes / (healthGoals.find(g => g.type === 'workouts_per_week')?.targetValue ?? 45)) * 100, 100)}%` }}
                  className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                />
              </div>
            </div>
            <div className="mt-3">
              <button 
                onClick={() => {
                  play('success');
                  addWorkout.mutate({ 
                    date: today, 
                    type: 'cardio', 
                    name: 'Quick Cardio Session',
                    durationMinutes: 15, 
                    caloriesBurned: 100,
                    startTime: new Date().toTimeString().slice(0, 5)
                  });
                }}
                className="w-full py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[10px] font-bold text-violet-400 hover:bg-violet-500/20 transition-all active:scale-95"
              >
                +15m Activity
              </button>
            </div>
          </div>

          {/* Sleep Card */}
          <div className="relative p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between min-h-[140px] group/card hover:border-indigo-500/30 transition-all duration-300">
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Moon size={16} />
              </div>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">Sleep</span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">{todayHealth.sleepEntry?.totalMinutes ? Math.round(todayHealth.sleepEntry.totalMinutes / 60) : 0}h</span>
                <span className="text-xs text-white/40">/ {healthGoals.find(g => g.type === 'sleep_hours')?.targetValue ?? 8} hrs</span>
              </div>
              <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(((todayHealth.sleepEntry?.totalMinutes ? (todayHealth.sleepEntry.totalMinutes / 60) : 0) / (healthGoals.find(g => g.type === 'sleep_hours')?.targetValue ?? 8)) * 100, 100)}%` }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Dynamic Trackers Grid */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            {trackers.map(t => (
              <TiltCard key={t.id}>
                <StatCard 
                  label={t.title} 
                  value={t.type === 'progress' ? `${t.items.filter(i => i.status === 'completed').length}/${t.target}` : t.items.length}
                  sub={t.unit || 'entries'} 
                  icon={<span className="text-2xl">{t.icon}</span>}
                  color="violet" 
                  onClick={() => navigate('/trackers')} 
                  customColor={t.color}
                />
              </TiltCard>
            ))}
            {/* If trackers < 3, add fillers to maintain layout or just let the Focus card be the 4th */}
            {trackers.length < 1 && <StatPlaceholder icon={<Sparkles size={16} />} label="No Trackers" onClick={() => navigate('/trackers')} />}
            {trackers.length < 2 && <StatPlaceholder icon={<Sparkles size={16} />} label="Add More" onClick={() => navigate('/trackers')} />}
            {trackers.length < 3 && <StatPlaceholder icon={<Sparkles size={16} />} label="Customize" onClick={() => navigate('/trackers')} />}
            
            <TiltCard>
              <StatCard label="Focus Hours" value={formatDuration(totalFocusMin)} sub={`${completedSessions} sessions`} icon={<Timer size={20} />} color="emerald" onClick={() => navigate('/focus')} />
            </TiltCard>
          </>
        )}
      </motion.div>

      {/* Two-column: Chart + Next Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Activity Chart + Finance Console */}
        <motion.div variants={item} className="col-span-1 lg:col-span-3 flex flex-col gap-6">
          <DeferredOnVisible
            minHeight={252}
            fallback={<div className="glass-card p-5 h-[252px]" />}
          >
            <Suspense fallback={<div className="glass-card p-5 h-[252px]" />}>
              <DashboardActivityChart data={last7} />
            </Suspense>
          </DeferredOnVisible>
          <FinanceWidget />
        </motion.div>

        {/* Right column */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-4">
          {/* Mission Control (Goal Console) */}
          <motion.div variants={item}>
            <MissionControl />
          </motion.div>

          {/* Recent achievements */}
          <motion.div variants={item} className="glass-card p-5">
            <div className="text-xs text-white/40 uppercase tracking-widest mb-3">Recent Achievements</div>
            {recentAchievements.length === 0 ? (
              <div className="text-sm text-white/30 text-center py-2">Complete tasks to earn badges!</div>
            ) : (
              <div className="space-y-2">
                {recentAchievements.map(ach => (
                  <div key={ach.id} className="flex items-center gap-3">
                    <span className="text-lg">{ach.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-white/80">{ach.title}</div>
                      <div className="text-xs text-white/30">{ach.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Quick Launcher */}
          <motion.div variants={item} className="glass-card p-5">
            <QuickLauncher />
          </motion.div>
        </div>
      </div>

      {/* Quick Actions */}
      <motion.div variants={item} className="glass-card p-5">
        <div className="text-xs text-white/40 uppercase tracking-widest mb-4">Quick Actions</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickAction icon={<Timer size={18} />} label="Start Focus" desc="Forest Mode" color="violet" onClick={() => navigate('/focus')} />
          <QuickAction icon={<BookOpen size={18} />} label="Log Chapter" desc={nextChapter ? `Next: Ch ${nextChapter.number}` : "Reading Tracker"} color="purple" onClick={() => navigate('/reading')} />
          <QuickAction icon={<Code2 size={18} />} label="Add Problem" desc="LeetCode Log" color="cyan" onClick={() => navigate('/leetcode')} />
          <QuickAction icon={<BarChart3 size={18} />} label="Analytics" desc="View Insights" color="emerald" onClick={() => navigate('/analytics')} />
        </div>
      </motion.div>
    </motion.div>
  );
}

const ScorePill = React.memo(function ScorePill({ icon, label, value, color, subText }: { icon: React.ReactNode; label: string; value: number; color: string; subText?: string }) {
  const colors: Record<string, string> = { violet: 'text-violet-400', cyan: 'text-cyan-400', emerald: 'text-emerald-400' };
  return (
    <div className="glass-card px-3 py-2 flex flex-col items-center gap-1 text-center group">
      <span className={`${colors[color]} group-hover:scale-110 transition-transform`}>{icon}</span>
      <motion.span 
        key={value}
        initial={{ scale: 1.5, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`text-xl font-bold ${colors[color]}`}
      >
        {value}
      </motion.span>
      <span className="text-xs text-white/30 uppercase tracking-widest font-black text-[8px]">{label}</span>
      {subText && <span className="text-[8px] text-white/20 font-bold">{subText}</span>}
    </div>
  );
});

const StreakCard = React.memo(function StreakCard({ label, streak, longest, color, icon }: { label: string; streak: number; longest: number; color: string; icon: React.ReactNode }) {
  const gradients: Record<string, string> = {
    violet: 'from-violet-600/20 to-purple-600/5',
    cyan: 'from-cyan-600/20 to-blue-600/5',
    emerald: 'from-emerald-600/20 to-teal-600/5',
  };
  const textColors: Record<string, string> = { violet: 'text-violet-400', cyan: 'text-cyan-400', emerald: 'text-emerald-400' };
  return (
    <div className={`glass-card p-5 bg-gradient-to-br ${gradients[color]} relative overflow-hidden group`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`${textColors[color]} group-hover:rotate-12 transition-transform`}>{icon}</span>
        <span className="text-xs text-white/40 uppercase tracking-widest font-black">{label}</span>
      </div>
      <div className="flex items-end gap-1">
        <motion.span 
          key={streak}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`text-4xl font-black ${textColors[color]}`}
        >
          {streak}
        </motion.span>
        <span className="text-white/30 mb-1 text-xs font-bold uppercase">days</span>
      </div>
      <div className="flex items-center gap-1 mt-1">
        <motion.div
          animate={{ 
            scale: [1, 1.15, 1],
            rotate: [-4, 4, -4]
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="filter drop-shadow-[0_0_6px_rgba(249,115,22,0.6)]"
        >
          <Flame size={12} className="text-orange-500" />
        </motion.div>
        <span className="text-xs text-white/30 font-medium tracking-tight">Personal Best: {longest}d</span>
      </div>
    </div>
  );
});

const StatCard = React.memo(function StatCard({ label, value, sub, icon, color, onClick, customColor }: {
  label: string; value: string | number; sub: string; icon: React.ReactNode; color: string; onClick: () => void; customColor?: string;
}) {
  const colors: Record<string, string> = { 
    violet: 'text-violet-400 bg-violet-500/10', 
    cyan: 'text-cyan-400 bg-cyan-500/10', 
    emerald: 'text-emerald-400 bg-emerald-500/10', 
    amber: 'text-amber-400 bg-amber-500/10' 
  };
  const colorClass = colors[color] || 'text-white/40 bg-white/5';
  const [tc, bg] = colorClass.split(' ');

  return (
    <button onClick={onClick} className="stat-card text-left glass-card-hover w-full group overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div 
        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110 ${bg} ${tc}`}
        style={customColor ? { backgroundColor: `${customColor}20`, color: customColor } : undefined}
      >
        {icon}
      </div>
      <motion.div 
        key={value}
        initial={{ x: -10, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="text-2xl font-black text-white truncate w-full"
      >
        {value}
      </motion.div>
      <div className="text-[10px] text-white/30 uppercase font-black tracking-widest mt-1 truncate w-full">{label}</div>
      <div className="text-[10px] text-white/40 font-bold mt-0.5">{sub}</div>
    </button>
  );
});

const StatPlaceholder = React.memo(function StatPlaceholder({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="stat-card text-left glass-card border border-dashed border-white/10 w-full group opacity-50 hover:opacity-100 transition-all">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 bg-white/5 text-white/20">
        {icon}
      </div>
      <div className="text-sm font-bold text-white/20 uppercase tracking-widest">{label}</div>
      <div className="text-[10px] text-white/10 font-bold mt-0.5">Click to add tracker</div>
    </button>
  );
});

const QuickAction = React.memo(function QuickAction({ icon, label, desc, color, onClick }: { icon: React.ReactNode; label: string; desc: string; color: string; onClick: () => void }) {
  const gradients: Record<string, string> = {
    violet: 'from-violet-600/20 to-violet-800/5 border-violet-500/20 hover:border-violet-500/40',
    purple: 'from-purple-600/20 to-purple-800/5 border-purple-500/20 hover:border-purple-500/40',
    cyan: 'from-cyan-600/20 to-cyan-800/5 border-cyan-500/20 hover:border-cyan-500/40',
    emerald: 'from-emerald-600/20 to-emerald-800/5 border-emerald-500/20 hover:border-emerald-500/40',
  };
  const textColors: Record<string, string> = { violet: 'text-violet-400', purple: 'text-purple-400', cyan: 'text-cyan-400', emerald: 'text-emerald-400' };
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border bg-gradient-to-br ${gradients[color]} transition-all duration-200 hover:scale-[1.02]`}
    >
      <span className={textColors[color]}>{icon}</span>
      <div className="text-sm font-semibold text-white">{label}</div>
      <div className="text-xs text-white/30">{desc}</div>
    </button>
  );
});
