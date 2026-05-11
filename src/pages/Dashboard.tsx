import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import {
  BookOpen, Code2, Timer, Flame, Trophy, TrendingUp,
  Target, Zap, ChevronRight, Star, CheckCircle2, Clock, Sparkles
} from 'lucide-react';
import { formatDuration, todayString, getProductivityScore } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { PRODUCTIVITY_QUOTES } from '../lib/data';
import TiltCard from '../components/TiltCard';
import ProductivityInsights from '../components/ProductivityInsights';
import Skeleton, { StatCardSkeleton, InsightSkeleton } from '../components/Skeleton';
import MissionControl from '../components/MissionControl';

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
  const {
    book, problems, focusSessions, readingStreak, codingStreak, focusStreak,
    achievements, dailyActivity, userSettings, trackers
  } = useAppStore();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const today = todayString();
  const todayActivity = dailyActivity.find(a => a.date === today);
  const completedChapters = book.chapters.filter(c => c.completed).length;
  const solvedProblems = problems.filter(p => p.completed).length;
  const completedSessions = focusSessions.filter(s => s.completed).length;
  const totalFocusMin = focusSessions.filter(s => s.completed).reduce((a, s) => a + (s.actualDuration || s.duration), 0);
  const unlockedAchievements = achievements.filter(a => a.unlocked).length;
  const progressPct = Math.round((completedChapters / 51) * 100);
  const prodScore = getProductivityScore(
    todayActivity?.chaptersRead || 0,
    todayActivity?.problemsSolved || 0,
    todayActivity?.focusMinutes || 0
  );
  const nextChapter = book.chapters.find(c => !c.completed);
  const quote = PRODUCTIVITY_QUOTES[new Date().getDay() % PRODUCTIVITY_QUOTES.length];

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
      <motion.div variants={item} className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-3">
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
          className="glass-card px-5 py-3 flex items-center gap-3 text-sm text-white/70 italic border-white/10 shadow-xl max-w-md bg-white/[0.02]"
        >
          <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
            <Star size={16} className="text-violet-400" />
          </div>
          <span className="line-clamp-2 leading-relaxed">"{quote.split('—')[0].trim()}"</span>
        </motion.div>
      </motion.div>

      {/* Productivity Score Banner */}
      <motion.div variants={item}>
        <TiltCard>
          <div className="glass-card p-8 relative overflow-hidden group">
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
              animate={{ 
                x: ['-100%', '100%'],
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity,
                ease: "linear"
              }}
            />
            <div className="relative flex items-center justify-between">
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
                <div className="mt-4 flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
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
              <div className="grid grid-cols-3 gap-6">
                <ScorePill icon={<BookOpen size={18} />} label="Library" value={todayActivity?.chaptersRead || 0} color="violet" />
                <ScorePill icon={<Code2 size={18} />} label="Coding" value={todayActivity?.problemsSolved || 0} color="cyan" />
                <ScorePill icon={<Timer size={18} />} label="Focus" value={todayActivity?.focusMinutes || 0} color="emerald" />
              </div>
            </div>
          </div>
        </TiltCard>
      </motion.div>

      {/* Productivity Insights */}
      <motion.div variants={item}>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InsightSkeleton />
            <InsightSkeleton />
          </div>
        ) : (
          <ProductivityInsights />
        )}
      </motion.div>

      {/* Streak Row */}
      <motion.div variants={item} className="grid grid-cols-3 gap-6">
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

      {/* Dynamic Trackers Grid */}
      <motion.div variants={item} className="grid grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            {trackers.slice(0, 3).map(t => (
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
            <TiltCard>
              <StatCard label="Focus Hours" value={formatDuration(totalFocusMin)} sub={`${completedSessions} sessions`} icon={<Timer size={20} />} color="emerald" onClick={() => navigate('/focus')} />
            </TiltCard>
          </>
        )}
      </motion.div>

      {/* Two-column: Chart + Next Actions */}
      <div className="grid grid-cols-5 gap-4">
        {/* Activity Chart */}
        <motion.div variants={item} className="col-span-3 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">Weekly Activity</h3>
            <span className="text-xs text-white/30">Last 7 days</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={last7} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
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
        </motion.div>

        {/* Right column */}
        <div className="col-span-2 flex flex-col gap-4">
          {/* Mission Control (Goal Console) */}
          <motion.div variants={item}>
            <MissionControl />
          </motion.div>

          {/* Recent achievements */}
          <motion.div variants={item} className="glass-card p-5">
            <div className="text-xs text-white/40 uppercase tracking-widest mb-3">Recent Achievements</div>
            {achievements.filter(a => a.unlocked).slice(0, 3).length === 0 ? (
              <div className="text-sm text-white/30 text-center py-2">Complete tasks to earn badges!</div>
            ) : (
              <div className="space-y-2">
                {achievements.filter(a => a.unlocked).slice(0, 3).map(ach => (
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
        </div>
      </div>

      {/* Quick Actions */}
      <motion.div variants={item} className="glass-card p-5">
        <div className="text-xs text-white/40 uppercase tracking-widest mb-4">Quick Actions</div>
        <div className="grid grid-cols-4 gap-3">
          <QuickAction icon={<Timer size={18} />} label="Start Focus" desc="Forest Mode" color="violet" onClick={() => navigate('/focus')} />
          <QuickAction icon={<BookOpen size={18} />} label="Log Chapter" desc="Reading Tracker" color="purple" onClick={() => navigate('/reading')} />
          <QuickAction icon={<Code2 size={18} />} label="Add Problem" desc="LeetCode Log" color="cyan" onClick={() => navigate('/leetcode')} />
          <QuickAction icon={<BarChart3 size={18} />} label="Analytics" desc="View Insights" color="emerald" onClick={() => navigate('/analytics')} />
        </div>
      </motion.div>
    </motion.div>
  );
}

function ScorePill({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
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
    </div>
  );
}

function StreakCard({ label, streak, longest, color, icon }: { label: string; streak: number; longest: number; color: string; icon: React.ReactNode }) {
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
            scale: [1, 1.2, 1],
            rotate: [-5, 5, -5],
            filter: ['drop-shadow(0 0 5px #f97316)', 'drop-shadow(0 0 10px #f97316)', 'drop-shadow(0 0 5px #f97316)']
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Flame size={12} className="text-orange-500" />
        </motion.div>
        <span className="text-xs text-white/30 font-medium tracking-tight">Personal Best: {longest}d</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, color, onClick, customColor }: {
  label: string; value: string | number; sub: string; icon: React.ReactNode; color: string; onClick: () => void; customColor?: string;
}) {
  const colors: Record<string, string> = { violet: 'text-violet-400 bg-violet-500/10', cyan: 'text-cyan-400 bg-cyan-500/10', emerald: 'text-emerald-400 bg-emerald-500/10', amber: 'text-amber-400 bg-amber-500/10' };
  const [tc, bg] = customColor ? ['', ''] : colors[color].split(' ');
  return (
    <button onClick={onClick} className="stat-card text-left glass-card-hover w-full group overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div 
        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110 ${customColor ? '' : `${bg} ${tc}`}`}
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
}

function BarChart3({ size }: { size: number }) {
  return <TrendingUp size={size} />;
}

function QuickAction({ icon, label, desc, color, onClick }: { icon: React.ReactNode; label: string; desc: string; color: string; onClick: () => void }) {
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
}
