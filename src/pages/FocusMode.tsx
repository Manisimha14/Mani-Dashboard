import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
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
  const { pomodoroSettings, updatePomodoroSettings, addFocusSession, focusSessions } = useAppStore();

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
  const [growthProgress, setGrowthProgress] = useState(0);
  const [sessionFailed, setSessionFailed]   = useState(false);
  const [volume, setVolume]             = useState(pomodoroSettings.ambienceVolume);

  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef  = useRef<number | null>(null);
  const timeLeftRef   = useRef(timeLeft);
  timeLeftRef.current = timeLeft;

  const totalDuration =
    mode === 'focus'       ? pomodoroSettings.focusDuration      * 60 :
    mode === 'short_break' ? pomodoroSettings.shortBreakDuration  * 60 :
                              pomodoroSettings.longBreakDuration   * 60;

  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference * (1 - progress / 100);

  /* ── reset when mode/duration settings change ── */
  useEffect(() => {
    if (!isRunning) { setTimeLeft(totalDuration); setGrowthProgress(0); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pomodoroSettings.focusDuration, pomodoroSettings.shortBreakDuration, pomodoroSettings.longBreakDuration]);

  /* ── tick ── */
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
          setGrowthProgress(((totalDuration - prev + 1) / totalDuration) * 100);
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  const handleSessionComplete = useCallback(() => {
    setIsRunning(false);
    if (mode === 'focus' && currentSession) {
      addFocusSession({
        ...currentSession,
        endTime: new Date().toISOString(),
        actualDuration: pomodoroSettings.focusDuration,
        completed: true,
        failed: false,
      } as Omit<FocusSession, 'id'>);
      soundEngine.sessionEnd(0.5);
      setSessionCount(c => c + 1);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      setShowReflection(true);
      setCurrentSession(null);
      toast.success('🎉 Focus complete! Tree fully grown!', { duration: 4000 });
      const shouldLong = (sessionCount + 1) % pomodoroSettings.sessionsBeforeLongBreak === 0;
      setMode(shouldLong ? 'long_break' : 'short_break');
    } else {
      soundEngine.success(0.35);
      toast.success('Break over! Ready to focus?');
      setMode('focus');
    }
    setTimeLeft(totalDuration);
    setGrowthProgress(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, currentSession, sessionCount, pomodoroSettings]);

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
    const actual = Math.round((Date.now() - (startTimeRef.current || Date.now())) / 60000);
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

  return (
    <div className={isFullscreen
      ? 'fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden'
      : 'max-w-4xl space-y-6'
    }
    style={isFullscreen ? {
      background: 'radial-gradient(ellipse at 50% 40%, hsl(240,30%,8%) 0%, hsl(225,35%,3%) 100%)',
    } : undefined}
    >
      {showConfetti && <Confetti recycle={false} numberOfPieces={300} />}

      {/* Fullscreen ambient particles */}
      {isFullscreen && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="particle w-1.5 h-1.5 rounded-full"
              style={{
                background: i % 3 === 0 ? '#8b5cf6' : i % 3 === 1 ? '#ec4899' : '#06b6d4',
                opacity: 0.25,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDuration: `${4 + Math.random() * 7}s`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Header (non-fullscreen) */}
      {!isFullscreen && (
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Forest Mode</h1>
            <p className="text-white/40 mt-1 text-sm">Deep work powered by Pomodoro</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSettings(true)}
              className="btn-ghost px-3 py-2 flex items-center gap-2 text-sm">
              <Settings size={14} /> Settings
            </button>
            <button onClick={() => setIsFullscreen(true)}
              className="btn-ghost px-3 py-2 flex items-center gap-2 text-sm">
              <Maximize2 size={14} /> Immersive
            </button>
          </div>
        </div>
      )}

      {/* Exit fullscreen */}
      {isFullscreen && (
        <button onClick={() => setIsFullscreen(false)}
          className="absolute top-5 right-5 btn-ghost px-3 py-2 flex items-center gap-2 text-sm z-10">
          <Minimize2 size={14} /> Exit
        </button>
      )}

      {/* ── Timer Card ── */}
      <div className={isFullscreen ? 'flex flex-col items-center gap-6 relative z-10' : 'glass-card p-8 flex flex-col items-center gap-6'}>
        {/* Mode selector */}
        <div className="flex gap-2">
          {(['focus', 'short_break', 'long_break'] as PomodoroMode[]).map(m => (
            <button key={m} disabled={isRunning}
              onClick={() => !isRunning && setMode(m)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                mode === m
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-white/30 hover:text-white/60'
              } disabled:opacity-40`}
            >
              {m === 'focus' ? '🎯 Focus' : m === 'short_break' ? '☕ Short' : '🌙 Long'}
            </button>
          ))}
        </div>

        {/* SVG Timer Ring */}
        <div className={`relative ${isFullscreen ? 'w-72 h-72' : 'w-60 h-60'}`}>
          <svg viewBox="0 0 280 280" className="w-full h-full -rotate-90"
            style={{ filter: `drop-shadow(0 0 24px ${modeColor}55)` }}>
            <circle cx="140" cy="140" r="120" fill="none"
              stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <motion.circle cx="140" cy="140" r="120" fill="none"
              stroke={`url(#timerGrad-${mode})`} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5, ease: 'linear' }}
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
              animate={{ scale: isRunning ? [1, 1.08, 1] : growthScale }}
              transition={{ repeat: isRunning ? Infinity : 0, duration: 2.5, ease: 'easeInOut' }}
              style={{ filter: sessionFailed ? 'grayscale(1) opacity(0.4)' : 'none' }}
              className="text-3xl select-none"
            >
              {growthEmoji}
            </motion.div>
            <div className={`font-mono font-black tabular-nums ${isFullscreen ? 'text-6xl' : 'text-4xl'} text-white`}
              style={{ textShadow: `0 0 30px ${modeColor}66` }}>
              {formatTime(timeLeft)}
            </div>
            <div className="text-xs text-white/30">
              {mode === 'focus' ? (taskName || 'Deep Focus') : mode === 'short_break' ? 'Short Break' : 'Long Break'}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {isRunning && currentSession && (
            <button onClick={handleGiveUp}
              className="px-4 py-2 text-sm text-red-400 border border-red-500/25 rounded-lg hover:bg-red-500/10 transition-all">
              Give Up
            </button>
          )}

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={isRunning ? () => setIsRunning(false) : handleStart}
            className="btn-glow px-10 py-3 flex items-center gap-3 text-base font-semibold rounded-xl"
            style={isRunning ? { background: 'linear-gradient(135deg,#ea580c,#dc2626)' } : undefined}
          >
            {isRunning ? <Pause size={18} /> : <Play size={18} />}
            {isRunning ? 'Pause' : currentSession ? 'Resume' : 'Start'}
          </motion.button>

          {!isRunning && (
            <button onClick={() => { setTimeLeft(totalDuration); setGrowthProgress(0); setCurrentSession(null); }}
              className="btn-ghost p-2.5 rounded-lg">
              <RotateCcw size={16} />
            </button>
          )}
          {mode !== 'focus' && (
            <button onClick={() => { setMode('focus'); setTimeLeft(pomodoroSettings.focusDuration * 60); setIsRunning(false); }}
              className="btn-ghost px-4 py-2 text-sm flex items-center gap-2">
              <SkipForward size={14} /> Skip
            </button>
          )}
        </div>

        {/* Ambience strip */}
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="flex gap-1.5 flex-wrap justify-center">
            {AMBIENCE_OPTIONS.map(a => (
              <button key={a.type}
                onClick={() => updatePomodoroSettings({ ambience: a.type })}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                  pomodoroSettings.ambience === a.type
                    ? 'bg-white/12 text-white border border-white/20'
                    : 'text-white/30 hover:text-white/60'
                }`}
              >
                {a.emoji} {a.label}
              </button>
            ))}
          </div>
          {pomodoroSettings.ambience !== 'none' && (
            <div className="flex items-center gap-3 text-xs text-white/40">
              <Volume2 size={12} />
              <input type="range" min="0" max="1" step="0.05" value={volume}
                onChange={e => { setVolume(+e.target.value); updatePomodoroSettings({ ambienceVolume: +e.target.value }); }}
                className="w-24 accent-violet-500" />
              <span>{Math.round(volume * 100)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Today stats (non-fullscreen) */}
      {!isFullscreen && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Sessions Today', value: completedToday, color: 'text-violet-400' },
            { label: 'Focus Min Today', value: `${focusMinToday}m`, color: 'text-emerald-400' },
            { label: 'Total Sessions', value: totalCompleted, color: 'text-cyan-400' },
          ].map(s => (
            <div key={s.label} className="glass-card p-5">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-white/40 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Session History */}
      {!isFullscreen && focusSessions.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-semibold text-white mb-4">Recent Sessions</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {focusSessions.slice(0, 8).map(s => (
              <div key={s.id}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  s.completed
                    ? 'bg-emerald-500/5 border border-emerald-500/10'
                    : 'bg-red-500/5 border border-red-500/10'
                }`}>
                <span className="text-lg">{s.completed ? '🌳' : '🍂'}</span>
                <div className="flex-1">
                  <div className="text-sm text-white/70">{s.taskName || 'Focus Session'}</div>
                  <div className="text-xs text-white/30">{s.date} · {s.actualDuration || s.duration}m</div>
                </div>
                <span className={`badge text-xs ${s.completed ? 'badge-easy' : 'badge-hard'}`}>
                  {s.completed ? 'Done' : 'Failed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
        <button onClick={() => { setShowReflection(false); setReflection(''); }}
          className="btn-glow w-full py-2.5 text-sm font-semibold">
          Continue →
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

          <button onClick={() => setShowSettings(false)} className="btn-glow w-full py-2 text-sm">
            Save Settings
          </button>
        </div>
      </Modal>
    </div>
  );
}
