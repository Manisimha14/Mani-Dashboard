import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { formatTime } from '../../lib/utils';
import type { GrowthTheme } from '../../types';

interface TimerCircleProps {
  isFullscreen: boolean;
}

const GROWTH_EMOJIS: Record<GrowthTheme, { growing: string; done: string; failed: string }> = {
  tree:    { growing: '🌱', done: '🌳', failed: '🍂' },
  crystal: { growing: '✨', done: '💎', failed: '💔' },
  bonsai:  { growing: '🌿', done: '🎋', failed: '🍂' },
  space:   { growing: '🌑', done: '🚀', failed: '💥' },
  cyber:   { growing: '⚡', done: '🌿', failed: '🥀' },
};

export const TimerCircle = React.memo(function TimerCircle({ isFullscreen }: TimerCircleProps) {
  // Subscribe directly to the active ticker states inside this isolated display wrapper
  const timeLeft = useAppStore((s) => s.focusTimer.timeLeft);
  const growthProgress = useAppStore((s) => s.focusTimer.growthProgress);
  const sessionFailed = useAppStore((s) => s.focusTimer.sessionFailed);
  const mode = useAppStore((s) => s.focusTimer.mode);
  const taskName = useAppStore((s) => s.focusTimer.taskName);
  const isRunning = useAppStore((s) => s.focusTimer.isRunning);
  const pomodoroSettings = useAppStore((s) => s.pomodoroSettings);

  const getDurationForMode = (m: typeof mode) => {
    return m === 'focus' ? pomodoroSettings.focusDuration * 60 :
           m === 'short_break' ? pomodoroSettings.shortBreakDuration * 60 :
           pomodoroSettings.longBreakDuration * 60;
  };

  const totalDuration = getDurationForMode(mode);
  const progress = totalDuration > 0 ? ((totalDuration - timeLeft) / totalDuration) * 100 : 0;
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference * (1 - progress / 100);

  const em = GROWTH_EMOJIS[pomodoroSettings.growthTheme];
  const growthEmoji = sessionFailed ? em.failed : growthProgress >= 90 ? em.done : em.growing;
  const growthScale = 0.5 + (growthProgress / 100) * 0.5;

  const modeColor = mode === 'focus' ? '#8b5cf6' : mode === 'short_break' ? '#10b981' : '#3b82f6';
  const modeColor2 = mode === 'focus' ? '#ec4899' : mode === 'short_break' ? '#06b6d4' : '#8b5cf6';

  return (
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
          className="text-4xl select-none mb-1 animate-pulse"
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
          className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] text-white/35 max-w-[200px] text-center line-clamp-2 break-words px-2"
        >
          {mode === 'focus' ? (taskName || 'Concentrate') : 'Recharge'}
        </motion.div>
      </div>
    </div>
  );
});
