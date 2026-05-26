import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { Helmet } from 'react-helmet-async';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useFocusSessions } from '../hooks/useFocusQuery';
import { focusTimerService } from '../services/focusTimerService';
import {
  Play, Pause, RotateCcw, Settings, Maximize2, Minimize2,
  Volume2, VolumeX, Leaf, SkipForward, BarChart3
} from 'lucide-react';
import { formatTime, todayString } from '../lib/utils';
import type { PomodoroMode, GrowthTheme, AmbienceType } from '../types';
import { soundEngine, useSoundFX } from '../hooks/useSoundFX';
import { TimerCircle } from '../components/focus/TimerCircle';
import { FocusHistory } from '../components/focus/FocusHistory';
import { ReflectionModal } from '../components/focus/ReflectionModal';
import { TaskPromptModal } from '../components/focus/TaskPromptModal';
import { FocusSettingsModal } from '../components/focus/FocusSettingsModal';
import { FocusParticles } from '../components/focus/FocusParticles';
import { Target, Clock, Award, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const FocusAnalytics = React.lazy(() => import('../components/FocusAnalytics'));

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

const GROWTH_THEMES = [
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
  const { pomodoroSettings, focusTimer, setFocusTimerState, updatePomodoroSettings } = useAppStore();
  const { play } = useSoundFX();
  const { data: focusSessions = [] } = useFocusSessions();

  // Local UI-only States (Isolated from Tick loop)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTaskPrompt, setShowTaskPrompt] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [lastCompletedSessionId, setLastCompletedSessionId] = useState<string | null>(null);
  const [volume, setVolume] = useState(pomodoroSettings.ambienceVolume);
  const [activeTab, setActiveTab] = useState<'timer' | 'analytics'>('timer');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPipActive, setIsPipActive] = useState(false);

  // Deconstruct focusTimer state
  const { mode, timeLeft, isRunning, sessionCount, taskName, mood, currentSession, growthProgress, sessionFailed, isZen } = focusTimer;

  const getDurationForMode = useCallback((m: PomodoroMode) => {
    return m === 'focus' ? pomodoroSettings.focusDuration * 60 :
           m === 'short_break' ? pomodoroSettings.shortBreakDuration * 60 :
           pomodoroSettings.longBreakDuration * 60;
  }, [pomodoroSettings]);

  const totalDuration = getDurationForMode(mode);

  // Sync ambience volume
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

  /* ── keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'z' && !showTaskPrompt && !showReflection && !showSettings) {
        setFocusTimerState({ isZen: !isZen });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showTaskPrompt, showReflection, showSettings, isZen, setFocusTimerState]);

  // If settings durations change and timer is NOT running, update remaining time
  useEffect(() => {
    if (!isRunning) {
      setFocusTimerState({ timeLeft: totalDuration });
    }
  }, [pomodoroSettings.focusDuration, pomodoroSettings.shortBreakDuration, pomodoroSettings.longBreakDuration, isRunning, totalDuration, setFocusTimerState]);

  const getTimerService = () => focusTimerService;

  const handleStart = () => {
    if (!isRunning && mode === 'focus' && !currentSession) {
      setShowTaskPrompt(true);
    } else {
      const remainingTime = timeLeft > 0 ? timeLeft : totalDuration;
      const targetEndTime = Date.now() + remainingTime * 1000;
      setFocusTimerState({ isRunning: true, endTime: targetEndTime });
      getTimerService().startEngine();
      play('sessionStart', 0.3);
    }
  };

  const confirmStart = (tName: string, mVal: string) => {
    setShowTaskPrompt(false);
    const session = {
      date: todayString(),
      startTime: new Date().toISOString(),
      duration: pomodoroSettings.focusDuration,
      taskName: tName || 'Concentrate',
      mood: mVal || 'focused',
      growthTheme: pomodoroSettings.growthTheme,
      ambience: pomodoroSettings.ambience,
      mode: 'focus' as PomodoroMode,
    };
    
    const targetEndTime = Date.now() + pomodoroSettings.focusDuration * 60 * 1000;
    
    setFocusTimerState({
      taskName: tName || 'Concentrate',
      mood: mVal || 'focused',
      currentSession: session,
      endTime: targetEndTime,
      timeLeft: pomodoroSettings.focusDuration * 60,
      growthProgress: 0,
      sessionFailed: false,
      isRunning: true,
    });
    
    getTimerService().startEngine();
    play('sessionStart', 0.4);
  };

  const handleGiveUp = async () => {
    await getTimerService().handleGiveUp();
  };

  const completedToday = focusSessions.filter(s => s.date === todayString() && s.completed).length;
  const focusMinToday  = focusSessions.filter(s => s.date === todayString() && s.completed)
    .reduce((a, s) => a + (s.actualDuration || s.duration), 0);
  const totalCompleted = focusSessions.filter(s => s.completed).length;

  const em = GROWTH_EMOJIS[pomodoroSettings.growthTheme];
  const growthEmoji = sessionFailed ? em.failed : growthProgress >= 90 ? em.done : em.growing;

  const modeColor = mode === 'focus' ? '#8b5cf6' : mode === 'short_break' ? '#10b981' : '#3b82f6';

  const drawPipCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 300;
    canvas.height = 300;

    const radialGrad = ctx.createRadialGradient(150, 150, 50, 150, 150, 150);
    radialGrad.addColorStop(0, '#1c133a');
    radialGrad.addColorStop(1, '#080911');
    ctx.fillStyle = radialGrad;
    ctx.fillRect(0, 0, 300, 300);

    const radius = 100;
    const cx = 150;
    const cy = 150;
    const total = totalDuration;
    const currentProgress = total > 0 ? (total - timeLeft) / total : 0;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (2 * Math.PI * currentProgress);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 14;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    const grad = ctx.createLinearGradient(50, 150, 250, 150);
    grad.addColorStop(0, mode === 'focus' ? '#8b5cf6' : '#10b981');
    grad.addColorStop(1, mode === 'focus' ? '#ec4899' : '#06b6d4');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 46px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatTime(timeLeft), cx, cy);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '900 12px sans-serif';
    const label = mode === 'focus' ? (taskName || 'Concentrate') : 'Recharge';
    ctx.fillText(label.toUpperCase().slice(0, 20), cx, cy + 42);

    ctx.font = '28px sans-serif';
    ctx.fillText(growthEmoji, cx, cy - 45);
  }, [timeLeft, totalDuration, mode, taskName, growthEmoji]);

  const togglePip = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPipActive(false);
      } else {
        const stream = (canvasRef.current as any).captureStream(30);
        video.srcObject = stream;
        video.onloadedmetadata = async () => {
          await video.play();
          await video.requestPictureInPicture();
          setIsPipActive(true);
        };
      }
    } catch (e) {
      console.warn('PiP setup failure:', e);
      toast.error('Picture-in-Picture mode not supported in this browser.');
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onEnter = () => setIsPipActive(true);
    const onLeave = () => setIsPipActive(false);

    video.addEventListener('enterpictureinpicture', onEnter);
    video.addEventListener('leavepictureinpicture', onLeave);

    return () => {
      video.removeEventListener('enterpictureinpicture', onEnter);
      video.removeEventListener('leavepictureinpicture', onLeave);
    };
  }, []);

  useEffect(() => {
    if (isPipActive) {
      drawPipCanvas();
    }
  }, [timeLeft, isPipActive, drawPipCanvas]);

  const content = (
    <div className={isFullscreen
      ? 'fixed inset-0 z-[1000] flex flex-col items-center justify-center overflow-hidden'
      : 'max-w-4xl space-y-6'
    }
    style={isFullscreen ? { background: 'radial-gradient(circle at center, #181030 0%, #030409 100%)' } : undefined}>
      
      <Helmet>
        <title>{isRunning ? `(${formatTime(timeLeft)}) Mani OS Focus` : 'Focus Portal — Mani OS'}</title>
      </Helmet>

      {/* Particles effect decoupled from page loop */}
      <FocusParticles isRunning={isRunning} isZen={isZen} isFullscreen={isFullscreen} />

      {!isZen && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <Leaf className="text-violet-400 animate-pulse" /> Focus Center
            </h1>
            <p className="text-white/40 text-xs sm:text-sm font-semibold mt-1">Decoupled singleton Pomodoro dashboard.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 shrink-0">
              <button 
                onClick={() => setActiveTab('timer')}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'timer' ? 'bg-violet-600 text-white shadow-lg' : 'text-white/40 hover:text-white/70'}`}
              >
                <Clock size={13} /> Timer
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
              <button onClick={() => setFocusTimerState({ isZen: true })}
                title="Zen Mode (Z)"
                className="btn-ghost p-2 sm:px-3 sm:py-2 flex items-center gap-1.5 text-xs sm:text-sm text-violet-400 border-violet-500/20">
                <Leaf size={14} /> <span className="hidden md:inline">Zen Mode</span>
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
        </div>
      )}

      {/* Main Tab Views */}
      <AnimatePresence mode="wait">
        {activeTab === 'timer' ? (
          <motion.div
            key="timer-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 gap-6 items-start relative z-10 w-full"
          >
            <div className={isFullscreen ? 'flex flex-col items-center gap-6 relative z-10 w-full' : 'glass-card p-8 flex flex-col items-center gap-6 relative overflow-hidden w-full'}>
              {!isFullscreen && (
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 blur-[100px] pointer-events-none" />
              )}
              
              {/* Mode selector */}
              {!isZen && (
                <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                  {(['focus', 'short_break', 'long_break'] as PomodoroMode[]).map(m => (
                    <button key={m} disabled={isRunning}
                      onClick={() => !isRunning && setFocusTimerState({ mode: m, timeLeft: getDurationForMode(m) })}
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
              )}

              {/* Decoupled Vector Timer Display */}
              <TimerCircle isFullscreen={isFullscreen} />

              {/* Controls */}
              <AnimatePresence>
                {!isZen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex items-center gap-4 animate-fade-in"
                  >
                    {isRunning && currentSession && (
                      <button onClick={handleGiveUp}
                        className="px-5 py-2.5 text-sm font-bold text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/10 transition-all">
                        Give Up
                      </button>
                    )}

                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={isRunning ? () => {
                        setFocusTimerState({ isRunning: false, endTime: null });
                        getTimerService().stopEngine();
                      } : handleStart}
                      className="btn-glow px-12 py-3.5 flex items-center gap-3 text-base font-bold rounded-2xl shadow-xl"
                      style={isRunning ? { background: 'linear-gradient(135deg,#ea580c,#dc2626)' } : undefined}
                    >
                      {isRunning ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                      {isRunning ? 'Pause' : currentSession ? 'Resume' : 'Start Focus'}
                    </motion.button>

                    {!isRunning && (
                      <button onClick={() => {
                        setFocusTimerState({
                          timeLeft: totalDuration,
                          growthProgress: 0,
                          currentSession: null
                        });
                      }}
                        className="btn-ghost p-3 rounded-xl border border-white/5">
                        <RotateCcw size={18} />
                      </button>
                    )}
                    {mode !== 'focus' && (
                      <button onClick={() => {
                        setFocusTimerState({
                          mode: 'focus',
                          timeLeft: pomodoroSettings.focusDuration * 60,
                          isRunning: false,
                          endTime: null
                        });
                        getTimerService().stopEngine();
                      }}
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
                    className="w-full max-w-lg mt-4 flex flex-col items-center gap-3 border-t border-white/5 pt-5"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-black uppercase tracking-wider text-white/30 flex items-center gap-1.5">
                        🎧 Synthesized Ambience
                      </span>
                      <button onClick={togglePip}
                        className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all ${
                          isPipActive ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20' : 'bg-white/5 text-white/40 hover:text-white border border-white/5'
                        }`}>
                        {isPipActive ? 'Close Mini' : 'Picture-in-Picture'}
                      </button>
                    </div>

                    <div className="flex flex-wrap justify-center gap-1.5 w-full">
                      {AMBIENCE_OPTIONS.map(opt => {
                        const isSelected = pomodoroSettings.ambience === opt.type;
                        return (
                          <button key={opt.type}
                            onClick={() => updatePomodoroSettings({ ambience: opt.type })}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                              isSelected
                                ? 'bg-violet-600 border-violet-500 text-white shadow-lg'
                                : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <span>{opt.emoji}</span>
                            <span className="hidden sm:inline">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Performance Stats Cards */}
            {!isFullscreen && !isZen && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Sessions Today', value: completedToday, color: 'text-violet-400', icon: Target },
                  { label: 'Minutes Focused', value: `${focusMinToday}m`, color: 'text-emerald-400', icon: Clock },
                  { label: 'Sprints Completed', value: totalCompleted, color: 'text-cyan-400', icon: Award }
                ].map((stat, idx) => {
                  const Icon = stat.icon;
                  return (
                    <div key={idx} className="glass-card p-4 flex items-center gap-4">
                      <div className="p-3 bg-white/5 rounded-2xl">
                        <Icon size={18} className={stat.color} />
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider font-black text-white/35">{stat.label}</div>
                        <div className="text-xl font-black text-white mt-0.5">{stat.value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Decoupled Memoized History Component */}
            <FocusHistory focusSessions={focusSessions} isFullscreen={isFullscreen} />
          </motion.div>
        ) : (
          <motion.div
            key="analytics-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full relative z-10"
          >
            <Suspense fallback={<div className="glass-card p-8 text-center text-white/40 text-xs font-bold uppercase tracking-widest animate-pulse">Loading analytics cockpit...</div>}>
              <FocusAnalytics />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit fullscreen button */}
      {isFullscreen && (
        <button onClick={() => setIsFullscreen(false)}
          className="absolute top-8 right-8 btn-ghost p-3 rounded-xl border border-white/10 z-50 text-white/60 hover:text-white">
          <Minimize2 size={18} />
        </button>
      )}

      {/* Modals Decoupled into isolated components */}
      <TaskPromptModal 
        open={showTaskPrompt} 
        onClose={() => setShowTaskPrompt(false)} 
        onConfirm={confirmStart} 
      />

      <ReflectionModal 
        open={showReflection} 
        onClose={() => {
          setShowReflection(false);
          setLastCompletedSessionId(null);
        }}
        lastCompletedSessionId={lastCompletedSessionId}
        setLastCompletedSessionId={setLastCompletedSessionId}
      />

      <FocusSettingsModal 
        open={showSettings} 
        onClose={() => setShowSettings(false)} 
      />

      <canvas ref={canvasRef} style={{ display: 'none' }} width={300} height={300} />
      <video ref={videoRef} style={{ display: 'none' }} muted playsInline />
    </div>
  );

  return isFullscreen ? createPortal(content, document.body) : content;
}
