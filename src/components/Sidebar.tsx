import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, BookOpen, Code2, Timer, BarChart3, FileText,
  Trophy, Settings, Zap, ChevronRight, Flame, Target, Sparkles, Heart, Music, X, Bug
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { todayString, getProductivityScore } from '../lib/utils';
import { useSoundFX } from '../hooks/useSoundFX';
import { useBook } from '../hooks/useBookQuery';
import { useProblems } from '../hooks/useLeetCodeQuery';
import { useFocusSessions } from '../hooks/useFocusQuery';
import { useProfile } from '../hooks/useProfileQuery';
import { useDailyActivity } from '../hooks/useActivityQuery';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/focus', icon: Timer, label: 'Focus' },
  { to: '/reading', icon: BookOpen, label: 'Learning' },
  { to: '/leetcode', icon: Code2, label: 'Coding' },
  { to: '/trackers', icon: Target, label: 'Trackers' },
  { to: '/health', icon: Heart, label: 'Health' },
  { to: '/ambient', icon: Music, label: 'Flowscape' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/achievements', icon: Trophy, label: 'Achievements' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const { data: book = { id: 'main-book', title: 'My Book', author: 'Author', chapters: [], startDate: todayString(), coverColor: '#7c3aed' } } = useBook();
  const { data: problems = [] } = useProblems();
  const { data: focusSessions = [] } = useFocusSessions();
  const { data: profile } = useProfile();
  const { data: dailyActivity = [] } = useDailyActivity();

  const readingStreak = profile?.readingStreak ?? { currentStreak: 0, longestStreak: 0, history: {} };
  const codingStreak = profile?.codingStreak ?? { currentStreak: 0, longestStreak: 0, history: {} };
  const focusStreak = profile?.focusStreak ?? { currentStreak: 0, longestStreak: 0, history: {} };
  const location = useLocation();
  const { play } = useSoundFX();
  const today = todayString();

  const chaptersToday = React.useMemo(() => {
    return book.chapters.filter(c => c.completed && c.dateCompleted === today).length;
  }, [book.chapters, today]);

  const problemsToday = React.useMemo(() => {
    return problems.filter(p => p.completed && p.date === today).length;
  }, [problems, today]);

  const focusMinutesToday = React.useMemo(() => {
    return focusSessions.filter(s => s.completed && s.date === today).reduce((acc, s) => acc + (s.actualDuration || s.duration), 0);
  }, [focusSessions, today]);

  const prodScore = React.useMemo(() => {
    return getProductivityScore(chaptersToday, problemsToday, focusMinutesToday);
  }, [chaptersToday, problemsToday, focusMinutesToday]);

  const isElite = React.useMemo(() => prodScore >= 80, [prodScore]);

  const completedChapters = React.useMemo(() => {
    return book.chapters.filter(c => c.completed).length;
  }, [book.chapters]);

  const solvedProblems = React.useMemo(() => {
    return problems.filter(p => p.completed).length;
  }, [problems]);

  const completedSessions = React.useMemo(() => {
    return focusSessions.filter(s => s.completed).length;
  }, [focusSessions]);

  const maxStreak = React.useMemo(() => {
    return Math.max(readingStreak.currentStreak, codingStreak.currentStreak, focusStreak.currentStreak);
  }, [readingStreak.currentStreak, codingStreak.currentStreak, focusStreak.currentStreak]);

  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference * (1 - Math.min(prodScore, 100) / 100);

  return (
    <div className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3 w-full">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-glow-sm p-1.5 flex-shrink-0">
            <img src="/favicon.svg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm tracking-tight text-white leading-tight">MANI OS</div>
            <div className="text-[10px] text-white/40 leading-tight">Premium Productivity</div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Streak Banner */}
      {maxStreak > 0 && (
        <div className="px-3 pt-4">
          <div className="glass-card px-3 py-2 flex items-center gap-2">
            <Flame size={14} className="text-orange-400 animate-pulse" />
            <span className="text-xs text-white/70">
              <span className="font-bold text-orange-400">{maxStreak}d</span> streak
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      {/* Elite Badge */}
      <AnimatePresence>
        {isElite && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="mx-3 mt-6 mb-2 p-3 rounded-2xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/10 border border-violet-500/20 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.3),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                <Sparkles size={16} className="text-white animate-pulse" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-violet-400">Elite Status</div>
                <div className="text-xs font-bold text-white">System Optimized</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="flex-1 px-3 space-y-1.5">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => { play('click'); onClose?.(); }}
            className="group block no-underline"
          >
            {({ isActive }) => (
              <motion.div
                whileHover={{ x: 6, backgroundColor: 'rgba(255,255,255,0.06)' }}
                whileTap={{ scale: 0.96 }}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 focus-visible:ring-2 focus-visible:ring-violet-500 outline-none ${
                  isActive 
                    ? 'text-violet-400 bg-violet-600/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]' 
                    : 'text-white/40 hover:text-white'
                }`}
                aria-label={`Navigate to ${label}`}
              >
                <div className={`transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]' : ''}`}>
                  <Icon size={18} />
                </div>
                <span className={`flex-1 text-sm font-medium tracking-tight ${isActive ? 'font-bold' : ''}`}>{label}</span>
                
                {isActive && (
                  <>
                    <motion.div
                      layoutId="nav-indicator"
                      className="w-1 h-5 rounded-full bg-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.8)]"
                      initial={false}
                    />
                    <div className="absolute left-0 w-1 h-5 bg-violet-500 blur-sm opacity-60" />
                  </>
                )}
              </motion.div>
            )}
          </NavLink>
        ))}

        {/* Premium Bug Report Sidebar Row */}
        <motion.button
          whileHover={{ x: 6, backgroundColor: 'rgba(244,63,94,0.06)' }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            play('click');
            window.dispatchEvent(new CustomEvent('toggle-bug-report'));
            onClose?.();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 outline-none text-rose-400 hover:text-rose-300 bg-rose-500/5 border border-rose-500/10 hover:border-rose-500/25 font-medium text-left mt-3"
          aria-label="Report Issue"
        >
          <div className="transition-transform duration-300 hover:scale-110">
            <Bug size={18} />
          </div>
          <span className="flex-1 text-sm font-semibold tracking-tight">Report Issue</span>
          <kbd className="hidden sm:inline-block text-[8px] font-mono opacity-50 px-1 py-0.5 bg-black/40 border border-rose-500/20 rounded text-rose-300/80">Ctrl+Shift+B</kbd>
        </motion.button>
      </nav>

      {/* Live Productivity Momentum - World Class Upgrade */}
      <div className="p-6 border-t border-white/5 space-y-5 bg-gradient-to-t from-white/[0.02] to-transparent">
        <div className="flex items-center justify-between">
          <div className="text-[10px] text-white/20 uppercase font-black tracking-[0.2em]">Momentum</div>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        </div>
        
        <div className="relative w-28 h-28 mx-auto group">
          {/* Heartbeat Pulse Ring */}
          <motion.div 
            animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full border border-violet-500/30 blur-[2px]"
          />

          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <defs>
              <linearGradient id="momentumGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#d946ef" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Background Track */}
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
            
            {/* Progress Stroke */}
            <motion.circle 
              cx="50" cy="50" r="42" fill="none" 
              stroke="url(#momentumGradient)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 42}
              initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - Math.min(prodScore, 100) / 100) }}
              transition={{ duration: 2, ease: "circOut" }}
              filter="url(#glow)"
              className="drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span 
              key={prodScore}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl font-black text-white tracking-tighter"
            >
              {prodScore}
            </motion.span>
            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest -mt-1">%</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="text-[11px] font-black text-white/80 uppercase tracking-widest text-center">
            {prodScore >= 70 ? 'God Mode 🔥' : prodScore >= 40 ? 'Velocity High ⚡' : 'Warmup 🔋'}
          </div>
          <div className="text-[9px] text-white/20 font-bold uppercase tracking-tighter">System Output: Optimized</div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(Sidebar);
