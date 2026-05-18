import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useFocusSessions, useAddFocusSession, useUpdateFocusSession } from '../hooks/useFocusQuery';
import {
  Play, Pause, SkipForward, RotateCcw, Settings, Maximize2, Minimize2,
  Volume2, VolumeX, Leaf, Music, Coffee, Wind, Keyboard, Rocket, X
} from 'lucide-react';
import { formatTime, generateId, todayString } from '../lib/utils';
import type { PomodoroMode, GrowthTheme, AmbienceType, FocusSession } from '../types';
import toast from 'react-hot-toast';
import Confetti from 'react-confetti';
import Modal from '../components/Modal';
import { soundEngine } from '../hooks/useSoundFX';
import FocusAnalytics from '../components/FocusAnalytics';
import { BarChart3, Timer as TimerIcon, Target, Clock, Award, Calendar } from 'lucide-react';

const AMBIENCE_OPTIONS: { type: AmbienceType; emoji: string; label: string }[] = [
  { type: 'none',        emoji: '🔇', label: 'Silent'     },
  { type: 'rain',        emoji: '🌧️', label: 'Rain'       },
  { type: 'forest',      emoji: '🌲', label: 'Forest'     },
  { type: 'cafe',        emoji: '☕', label: 'Café'        },
  { type: 'lofi',        emoji: '🎵', label: 'Lo-Fi'      },
  { type: 'white_noise', emoji: '〰️', label: 'White Noise' },
  { type: 'keyboard',    emoji: '⌨️', label: 'Keyboard'   },
  { type: 'space',       emoji: '🌌', label: 'Space'      },
];

const GROWTH_THEMES: { type: GrowthTheme; emoji: string; label: string }[] = [
  { type: 'tree',    emoji: '🌳', label: 'Tree'        },
  { type: 'crystal', emoji: '💎', label: 'Crystal'     },
  { type: 'bonsai',  emoji: '🎋', label: 'Bonsai'      },
  { type: 'space',   emoji: '🚀', label: 'Space'       },
  { type: 'cyber',   emoji: '🌿', label: 'Cyber Plant' },
];

const GROWTH_EMOJIS: Record<GrowthTheme, { growing: string; done: string; failed: string }> = {
  tree:    { growing: '🌱', done: '🌳', failed: '🍂' },
  crystal: { growing: '✨', done: '💎', failed: '💔' },
  bonsai:  { growing: '🌿', done: '🎋', failed: '🍂' },
  space:   { growing: '🌑', done: '🚀', failed: '💥' },
  cyber:   { growing: '⚡', done: '🌿', failed: '🥀' },
};

export default function FocusMode() {
  const pomodoroSettings = useAppStore(s => s.pomodoroSettings);
  const updatePomodoroSettings = useAppStore(s => s.updatePomodoroSettings);
  
  const { data: focusSessions = [] } = useFocusSessions();
  const { mutateAsync: addFocusSession } = useAddFocusSession();
  const { mutate: updateFocusSession } = useUpdateFocusSession();

  const [mode, setMode]                 = useState<PomodoroMode>('focus');
  const [timeLeft, setTimeLeft]         = useState(pomodoroSettings.focusDuration * 60);
  const [isRunning, setIsRunning]       = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [taskName, setTaskName]         = useState('');
  const [mood, setMood]                 = useState('');
  const [showTaskPrompt, setShowTaskPrompt]   = useState(false);
  const [showReflection, setShowReflection]   = useState(false);
  const [reflection, setReflection]     = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [currentSession, setCurrentSession] = useState<Partial<FocusSession> | null>(null);
  const [lastCompletedSessionId, setLastCompletedSessionId] = useState<string | null>(null);
  const [growthProgress, setGrowthProgress] = useState(0);
  const [sessionFailed, setSessionFailed]   = useState(false);
  const [volume, setVolume]             = useState(pomodoroSettings.ambienceVolume);
  const [isZen, setIsZen]               = useState(false);
  const [activeTab, setActiveTab]       = useState<'timer' | 'analytics'>('timer');

  const particles = useMemo(() => Array.from({ length: 24 }).map((_, i) => ({
    id: i,
    bg: i % 3 === 0 ? '#8b5cf6' : i % 3 === 1 ? '#ec4899' : '#06b6d4',
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    duration: 5 + Math.random() * 10,
    x: [0, Math.random() * 20 - 10, 0],
  })), []);

  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef  = useRef<number | null>(null);
  const timeLeftRef   = useRef(timeLeft);
  timeLeftRef.current = timeLeft;

  const getDurationForMode = useCallback((m: PomodoroMode) => {
    return m === 'focus' ? pomodoroSettings.focusDuration * 60 :
           m === 'short_break' ? pomodoroSettings.shortBreakDuration * 60 :
           pomodoroSettings.longBreakDuration * 60;
  }, [pomodoroSettings]);

  const totalDuration = getDurationForMode(mode);

  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference * (1 - progress / 100);

  /* ── reset when mode/duration settings change ── */
  useEffect(() => {
    if (!isRunning) { 
      setTimeLeft(totalDuration); 
      setGrowthProgress(0); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pomodoroSettings.focusDuration, pomodoroSettings.shortBreakDuration, pomodoroSettings.longBreakDuration]);

  // Sync volume state with settings
  useEffect(() => {
    setVolume(pomodoroSettings.ambienceVolume);
  }, [pomodoroSettings.ambienceVolume]);

  // Start/Stop Synthesized Ambience
  useEffect(() => {
    if (isRunning && mode === 'focus') {
      soundEngine.startAmbience(pomodoroSettings.ambience, volume);
    } else {
      soundEngine.stopAmbience();
    }
    return () => {
      soundEngine.stopAmbience();
    };
  }, [isRunning, pomodoroSettings.ambience, mode, volume]);

  /* ── tick ── */
  /* ── keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'z' && !showTaskPrompt && !showReflection && !showSettings) {
        setIsZen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showTaskPrompt, showReflection, showSettings]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            handleSessionComplete();
            return 0;
          }
          // subtle tick every 60 s
          if (prev % 60 === 0) soundEngine.tick(0.08);
          // Use a ref for totalDuration if needed, but let's ensure it's in deps
          setGrowthProgress(((getDurationForMode(mode) - prev + 1) / getDurationForMode(mode)) * 100);
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  const handleSessionComplete = useCallback(async () => {
    setIsRunning(false);
    if (mode === 'focus' && currentSession) {
      const duration = pomodoroSettings.focusDuration;
      const score = Math.min(100, Math.round((duration / 25) * 80 + (mood === 'energetic' ? 20 : mood === 'motivated' ? 15 : 10)));
      
      const createdSession = await addFocusSession({
        ...currentSession,
        endTime: new Date().toISOString(),
        actualDuration: duration,
        completed: true,
        failed: false,
        mood,
        productivityScore: score,
        reflection: reflection || undefined,
      } as Omit<FocusSession, 'id'>);
      setLastCompletedSessionId((createdSession as FocusSession | undefined)?.id ?? null);
      soundEngine.sessionEnd(0.5);
      setSessionCount(c => c + 1);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      setShowReflection(true);
      setCurrentSession(null);
      toast.success('🎉 Focus complete! Tree fully grown!', { duration: 4000 });
      const shouldLong = (sessionCount + 1) % pomodoroSettings.sessionsBeforeLongBreak === 0;
      const nextMode = shouldLong ? 'long_break' : 'short_break';
      setMode(nextMode);
      setTimeLeft(getDurationForMode(nextMode));
    } else {
      soundEngine.success(0.35);
      toast.success('Break over! Ready to focus?');
      setMode('focus');
      setTimeLeft(getDurationForMode('focus'));
    }
    setGrowthProgress(0);
    setSessionFailed(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, currentSession, sessionCount, pomodoroSettings, mood, reflection, getDurationForMode, addFocusSession]);

  const handleStart = () => {
    if (!isRunning && mode === 'focus' && !currentSession) {
      setShowTaskPrompt(true);
    } else {
      setIsRunning(true);
      soundEngine.sessionStart(0.3);
    }
  };

  const confirmStart = () => {
    setShowTaskPrompt(false);
    setCurrentSession({
      date: todayString(),
      startTime: new Date().toISOString(),
      duration: pomodoroSettings.focusDuration,
      taskName,
      mood,
      growthTheme: pomodoroSettings.growthTheme,
      ambience: pomodoroSettings.ambience,
      mode: 'focus',
    });
    startTimeRef.current = Date.now();
    soundEngine.sessionStart(0.4);
    setIsRunning(true);
    setSessionFailed(false);
  };

  const handleGiveUp = () => {
    if (!currentSession) return;
    const elapsedMs = Date.now() - (startTimeRef.current || Date.now());
    const actual = Math.max(0, Math.round(elapsedMs / 60000));
    addFocusSession({
      ...currentSession,
      endTime: new Date().toISOString(),
      actualDuration: actual,
      completed: false,
      failed: true,
    } as Omit<FocusSession, 'id'>);
    soundEngine.error(0.3);
    setIsRunning(false);
    setCurrentSession(null);
    setSessionFailed(true);
    setTimeLeft(totalDuration);
    setGrowthProgress(0);
    toast.error('Session ended early. Your tree withered 🍂');
  };

  const completedToday = focusSessions.filter(s => s.date === todayString() && s.completed).length;
  const focusMinToday  = focusSessions.filter(s => s.date === todayString() && s.completed)
    .reduce((a, s) => a + (s.actualDuration || s.duration), 0);
  const totalCompleted = focusSessions.filter(s => s.completed).length;

  const em = GROWTH_EMOJIS[pomodoroSettings.growthTheme];
  const growthEmoji = sessionFailed ? em.failed : growthProgress >= 90 ? em.done : em.growing;
  const growthScale = 0.5 + (growthProgress / 100) * 0.5;

  const modeColor = mode === 'focus' ? '#8b5cf6' : mode === 'short_break' ? '#10b981' : '#3b82f6';
  const modeColor2 = mode === 'focus' ? '#ec4899' : mode === 'short_break' ? '#06b6d4' : '#8b5cf6';

  const content = (
    <div className={isFullscreen
      ? 'fixed inset-0 z-[1000] flex flex-col items-center justify-center overflow-hidden'
      : 'max-w-4xl space-y-6'
    }
    style={isFullscreen ? {
      background: 'radial-gradient(ellipse at 50% 40%, hsl(240,30%,8%) 0%, hsl(225,35%,3%) 100%)',
    } : undefined}
    >
      {showConfetti && <Confetti recycle={false} numberOfPieces={300} />}

      <AnimatePresence>
        {!isZen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 px-4"
          >
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white uppercase">Focus Hub</h1>
              <p className="text-white/40 text-xs md:text-sm mt-0.5">Deep work powered by Pomodoro</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              {/* Premium Tab Switcher */}
              <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex">
                <button 
                  onClick={() => setActiveTab('timer')}
                  className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'timer' ? 'bg-violet-600 text-white shadow-lg' : 'text-white/40 hover:text-white/70'}`}
                >
                  <TimerIcon size={13} /> Timer
                </button>
                <button 
                  onClick={() => setActiveTab('analytics')}
                  className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'analytics' ? 'bg-violet-600 text-white shadow-lg' : 'text-white/40 hover:text-white/70'}`}
                >
                  <BarChart3 size={13} /> Analytics
                </button>
              </div>

              <div className="h-6 w-[1px] bg-white/10 mx-0.5 hidden xs:block" />

              <div className="flex gap-1.5 sm:gap-2">
                <button onClick={() => setIsZen(true)}
                  title="Zen Mode (Z)"
                  className="btn-ghost p-2 sm:px-3 sm:py-2 flex items-center gap-1.5 text-xs sm:text-sm text-violet-400 border-violet-500/20">
                  <Leaf size={14} /> <span className="hidden md:inline">Zen Mode</span> <kbd className="hidden md:inline text-[10px] opacity-40 ml-1">Z</kbd>
                </button>
                <button onClick={() => setShowSettings(true)}
                  title="Timer Settings"
                  className="btn-ghost p-2 sm:px-3 sm:py-2 flex items-center gap-1.5 text-xs sm:text-sm">
                  <Settings size={14} /> <span className="hidden md:inline">Settings</span>
                </button>
                <button onClick={() => setIsFullscreen(true)}
                  title="Immersive Mode"
                  className="btn-ghost p-2 sm:px-3 sm:py-2 flex items-center gap-1.5 text-xs sm:text-sm">
                  <Maximize2 size={14} /> <span className="hidden md:inline">Immersive</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen ambient particles */}
      {(isFullscreen || isZen) && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((p) => (
            <motion.div 
              key={p.id} 
              className="particle w-1.5 h-1.5 rounded-full"
              animate={{
                y: [-20, 100, -20],
                x: p.x,
                opacity: [0.1, 0.4, 0.1]
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{
                background: p.bg,
                left: p.left,
                top: p.top,
              }}
            />
          ))}
        </div>
      )}

      {isZen && (
        <motion.button 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.2 }}
          whileHover={{ opacity: 1 }}
          onClick={() => setIsZen(false)}
          className="absolute top-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-all z-50"
        >
          Exit Zen Mode <kbd className="ml-2 border border-white/20 px-1 rounded">Z</kbd>
        </motion.button>
      )}

      {/* Exit fullscreen */}
      {isFullscreen && (
        <button onClick={() => setIsFullscreen(false)}
          className="absolute top-5 right-5 btn-ghost px-3 py-2 flex items-center gap-2 text-sm z-[1001]">
          <Minimize2 size={14} /> Exit
        </button>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'timer' ? (
          <motion.div
            key="timer-tab"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6 w-full flex flex-col items-center"
          >
            {/* ── Timer Card ── */}
            <div className={isFullscreen ? 'flex flex-col items-center gap-6 relative z-10 w-full' : 'glass-card p-8 flex flex-col items-center gap-6 relative overflow-hidden w-full'}>
              {!isFullscreen && (
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 blur-[100px] pointer-events-none" />
              )}
              
              {/* Mode selector */}
              <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                {(['focus', 'short_break', 'long_break'] as PomodoroMode[]).map(m => (
                  <button key={m} disabled={isRunning}
                    onClick={() => !isRunning && setMode(m)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      mode === m
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                    } disabled:opacity-40`}
                  >
                    {m === 'focus' ? '🎯 Focus' : m === 'short_break' ? '☕ Short' : '🌙 Long'}
                  </button>
                ))}
              </div>

              {/* SVG Timer Ring */}
              <div className={`relative ${isFullscreen ? 'w-80 h-80' : 'w-64 h-64'}`}>
                <svg viewBox="0 0 280 280" className="w-full h-full -rotate-90"
                  style={{ filter: `drop-shadow(0 0 30px ${modeColor}44)` }}>
                  <circle cx="140" cy="140" r="120" fill="none"
                    stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
                  <motion.circle cx="140" cy="140" r="120" fill="none"
                    stroke={`url(#timerGrad-${mode})`} strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={circumference}
                    animate={{ 
                      strokeDashoffset,
                      strokeWidth: isRunning ? [6, 8, 6] : 6,
                    }}
                    transition={{ 
                      strokeDashoffset: { duration: 0.5, ease: 'linear' },
                      strokeWidth: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }}
                  />
                  <defs>
                    <linearGradient id={`timerGrad-${mode}`} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={modeColor} />
                      <stop offset="100%" stopColor={modeColor2} />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                  <motion.div
                    animate={{ scale: isRunning ? [1, 1.1, 1] : growthScale }}
                    transition={{ repeat: isRunning ? Infinity : 0, duration: 2.5, ease: 'easeInOut' }}
                    style={{ filter: sessionFailed ? 'grayscale(1) opacity(0.4)' : 'none' }}
                    className="text-4xl select-none mb-1"
                  >
                    {growthEmoji}
                  </motion.div>
                  <div className={`font-mono font-black tabular-nums ${isFullscreen ? 'text-7xl' : 'text-5xl'} text-white tracking-tight`}
                    style={{ textShadow: `0 0 40px ${modeColor}55` }}>
                    {formatTime(timeLeft)}
                  </div>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs font-bold uppercase tracking-[0.2em] text-white/30"
                  >
                    {mode === 'focus' ? (taskName || 'Concentrate') : 'Recharge'}
                  </motion.div>
                </div>
              </div>

              {/* Controls */}
              <AnimatePresence>
                {!isZen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex items-center gap-4"
                  >
                    {isRunning && currentSession && (
                      <button onClick={handleGiveUp}
                        className="px-5 py-2.5 text-sm font-bold text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/10 transition-all">
                        Give Up
                      </button>
                    )}

                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={isRunning ? () => setIsRunning(false) : handleStart}
                      className="btn-glow px-12 py-3.5 flex items-center gap-3 text-base font-bold rounded-2xl shadow-xl"
                      style={isRunning ? { background: 'linear-gradient(135deg,#ea580c,#dc2626)' } : undefined}
                    >
                      {isRunning ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                      {isRunning ? 'Pause' : currentSession ? 'Resume' : 'Start Focus'}
                    </motion.button>

                    {!isRunning && (
                      <button onClick={() => { setTimeLeft(totalDuration); setGrowthProgress(0); setCurrentSession(null); }}
                        className="btn-ghost p-3 rounded-xl border border-white/5">
                        <RotateCcw size={18} />
                      </button>
                    )}
                    {mode !== 'focus' && (
                      <button onClick={() => { setMode('focus'); setTimeLeft(pomodoroSettings.focusDuration * 60); setIsRunning(false); }}
                        className="btn-ghost px-5 py-2.5 text-sm font-bold flex items-center gap-2 rounded-xl">
                        <SkipForward size={16} /> Skip
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Ambience strip */}
              <AnimatePresence>
                {!isZen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-4 w-full mt-2"
                  >
                    <div className="flex gap-2 flex-wrap justify-center">
                      {AMBIENCE_OPTIONS.map(a => (
                        <button key={a.type}
                          onClick={() => updatePomodoroSettings({ ambience: a.type })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                            pomodoroSettings.ambience === a.type
                              ? 'bg-white/10 text-white border-white/20 shadow-lg'
                              : 'text-white/25 border-transparent hover:text-white/50 hover:bg-white/5'
                          }`}
                        >
                          {a.emoji} {a.label}
                        </button>
                      ))}
                    </div>
                    {pomodoroSettings.ambience !== 'none' && (
                      <div className="flex items-center gap-4 text-xs font-bold text-white/30 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                        <Volume2 size={14} className="text-violet-400" />
                        <input type="range" min="0" max="1" step="0.05" value={volume}
                          onChange={e => { setVolume(+e.target.value); updatePomodoroSettings({ ambienceVolume: +e.target.value }); }}
                          className="w-32 accent-violet-500 h-1" />
                        <span className="w-8">{Math.round(volume * 100)}%</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Today stats (non-fullscreen) */}
            {!isFullscreen && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                {[
                  { label: 'Sessions Today', value: completedToday, color: 'text-violet-400', icon: Target },
                  { label: 'Focus Min Today', value: `${focusMinToday}m`, color: 'text-emerald-400', icon: Clock },
                  { label: 'Total Completed', value: totalCompleted, color: 'text-cyan-400', icon: Award },
                ].map(s => (
                  <div key={s.label} className="glass-card p-5 flex items-center gap-4">
                    <div className={`p-2.5 rounded-lg bg-white/5 ${s.color}`}>
                      <s.icon size={18} />
                    </div>
                    <div>
                      <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                      <div className="text-[10px] uppercase tracking-wider font-bold text-white/30">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Session History */}
            {!isFullscreen && focusSessions.length > 0 && (
              <div className="glass-card p-6 w-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                    <Calendar size={20} className="text-violet-400" />
                    Recent Focus History
                  </h3>
                  <button className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors">View All</button>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {focusSessions.slice(0, 10).map(s => (
                    <div key={s.id}
                      className={`flex items-center gap-4 p-4 rounded-2xl transition-all border ${
                        s.completed
                          ? 'bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10'
                          : 'bg-red-500/5 border-red-500/10 hover:bg-red-500/10'
                      }`}>
                      <div className="text-2xl bg-white/5 p-2 rounded-xl">{s.completed ? '🌳' : '🍂'}</div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-white">{s.taskName || 'Unnamed Focus Session'}</div>
                        <div className="text-[10px] font-medium text-white/30 flex items-center gap-2 mt-0.5">
                          <span>{s.date}</span>
                          <span className="w-1 h-1 rounded-full bg-white/10" />
                          <span>{s.actualDuration || s.duration}m</span>
                          {s.mood && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-white/10" />
                              <span className="capitalize">{s.mood}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${s.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {s.completed ? 'Done' : 'Failed'}
                        </span>
                        {s.productivityScore && (
                          <span className="text-[10px] font-bold text-white/40">{s.productivityScore} pts</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="analytics-tab"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full"
          >
            <FocusAnalytics />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modals (all centered via <Modal>) ── */}

      {/* Task Prompt & Mood Tracker */}
      <Modal open={showTaskPrompt} onClose={() => setShowTaskPrompt(false)} maxWidth="max-w-md" showClose={false}>
        <div className="text-center mb-5">
          <div className="text-4xl mb-3">🎯</div>
          <h3 className="font-bold text-white text-lg">Set Your Intention</h3>
          <p className="text-white/40 text-sm mt-1">What are you focusing on?</p>
        </div>
        <input
          className="input-glass w-full px-4 py-3 text-sm text-center mb-4"
          placeholder="e.g. Solve DP problems, read chapter 12…"
          value={taskName}
          onChange={e => setTaskName(e.target.value)}
          autoFocus
          onKeyDown={e => e.key === 'Enter' && mood && confirmStart()}
        />
        
        <div className="mb-6">
          <label className="text-xs text-white/40 mb-2 block text-center">How are you feeling?</label>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { id: 'energetic', emoji: '⚡', label: 'Energetic' },
              { id: 'calm', emoji: '🧘', label: 'Calm' },
              { id: 'motivated', emoji: '🔥', label: 'Motivated' },
              { id: 'tired', emoji: '🥱', label: 'Tired' },
              { id: 'stressed', emoji: '😫', label: 'Stressed' }
            ].map(m => (
              <button key={m.id} onClick={() => setMood(m.id)} className={`px-3 py-1.5 rounded-lg text-sm transition-all border ${mood === m.id ? 'bg-violet-600 border-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}>
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <motion.button whileTap={{ scale: 0.96 }} onClick={confirmStart} disabled={!mood}
            className="btn-glow flex-1 py-2.5 text-sm font-semibold disabled:opacity-50">
            🌱 Plant & Focus
          </motion.button>
          <button onClick={() => setShowTaskPrompt(false)} className="btn-ghost px-4 py-2.5 text-sm">
            Cancel
          </button>
        </div>
      </Modal>

      {/* Reflection & Timeline Replay */}
      <Modal open={showReflection} onClose={() => { setShowReflection(false); setReflection(''); }}
        maxWidth="max-w-md" showClose={false}>
        <div className="text-center mb-5">
          <motion.div className="text-5xl mb-3" animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.6, repeat: 2 }}>{growthEmoji}</motion.div>
          <h3 className="font-bold text-white text-lg">Session Complete!</h3>
          <p className="text-white/40 text-sm mt-1">You focused for {pomodoroSettings.focusDuration} minutes</p>
        </div>

        {/* Timeline Replay Visualization */}
        <div className="mb-6 p-4 glass-card relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-emerald-600/10" />
          <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3 relative z-10">Session Timeline</h4>
          <div className="h-2 w-full bg-white/10 rounded-full relative overflow-hidden mb-2 z-10">
            <motion.div 
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-violet-500 to-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 2, ease: 'easeInOut', delay: 0.2 }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/40 relative z-10">
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>Started</motion.span>
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>Deep Focus</motion.span>
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}>Completed</motion.span>
          </div>
        </div>

        <textarea
          className="input-glass w-full px-3 py-2 text-sm resize-none mb-4"
          rows={3}
          placeholder="Reflect on your session. What did you accomplish?"
          value={reflection}
          onChange={e => setReflection(e.target.value)}
        />
        <button onClick={() => {
          if (reflection && lastCompletedSessionId) {
            updateFocusSession({ id: lastCompletedSessionId, updates: { reflection } });
          }
          setShowReflection(false);
          setReflection('');
          setLastCompletedSessionId(null);
        }}
          className="btn-glow w-full py-2.5 text-sm font-semibold">
          Complete Reflection →
        </button>
      </Modal>

      {/* Settings */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Timer Settings" maxWidth="max-w-md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Focus (min)',            key: 'focusDuration',              min: 1,  max: 120 },
              { label: 'Short Break (min)',       key: 'shortBreakDuration',         min: 1,  max: 30  },
              { label: 'Long Break (min)',        key: 'longBreakDuration',          min: 5,  max: 60  },
              { label: 'Sessions → Long Break',  key: 'sessionsBeforeLongBreak',    min: 1,  max: 8   },
            ].map(({ label, key, min, max }) => (
              <div key={key}>
                <label className="text-xs text-white/40 mb-1 block">{label}</label>
                <input type="number" min={min} max={max}
                  className="input-glass w-full px-3 py-2 text-sm"
                  value={(pomodoroSettings as any)[key]}
                  onChange={e => updatePomodoroSettings({ [key]: +e.target.value } as any)} />
              </div>
            ))}
          </div>

          <div>
            <label className="text-xs text-white/40 mb-2 block">Growth Theme</label>
            <div className="flex gap-2 flex-wrap">
              {GROWTH_THEMES.map(t => (
                <button key={t.type}
                  onClick={() => updatePomodoroSettings({ growthTheme: t.type })}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all border ${
                    pomodoroSettings.growthTheme === t.type
                      ? 'bg-white/10 text-white border-white/25'
                      : 'text-white/30 border-white/8 hover:text-white/60'
                  }`}>
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => { setShowSettings(false); toast.success('Settings saved!'); }} className="btn-glow w-full py-2 text-sm">
            Save Settings
          </button>
        </div>
      </Modal>
    </div>
  );

  return isFullscreen ? createPortal(content, document.body) : content;
}
