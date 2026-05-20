import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useSoundFX } from '../hooks/useSoundFX';
import { Brain, Sparkles, Zap, Compass, Activity, Cpu, BatteryCharging } from 'lucide-react';
import type { AppMood } from '../types';

const MINDSET_MODES = {
  focused: {
    id: 'focused',
    label: 'Deep Focus',
    icon: Brain,
    color: 'text-violet-400',
    borderColor: 'border-violet-500/20',
    bgColor: 'bg-violet-500/5',
    activeBg: 'bg-violet-500/15',
    activeBorder: 'border-violet-500/40',
    glow: 'shadow-[0_0_20px_rgba(139,92,246,0.35)]',
    frequency: 'Peak Flow',
    load: 88,
    intensity: 95,
    depletion: 35,
    gradient: 'from-violet-500 via-purple-500 to-indigo-500',
    blobColor: 'rgba(139,92,246,0.18)',
    pulseSpeed: 3,
    description: 'Allocates high concentration and blocks background noise. Best for deep coding sprints, algorithm analysis, and structured learning.',
  },
  creative: {
    id: 'creative',
    label: 'Creative Flow',
    icon: Sparkles,
    color: 'text-fuchsia-400',
    borderColor: 'border-fuchsia-500/20',
    bgColor: 'bg-fuchsia-500/5',
    activeBg: 'bg-fuchsia-500/15',
    activeBorder: 'border-fuchsia-500/40',
    glow: 'shadow-[0_0_20px_rgba(236,72,153,0.35)]',
    frequency: 'Creative Mode',
    load: 62,
    intensity: 75,
    depletion: 18,
    gradient: 'from-fuchsia-500 via-pink-500 to-rose-500',
    blobColor: 'rgba(236,72,153,0.18)',
    pulseSpeed: 5,
    description: 'Fosters lateral thinking and exploratory work. Best for interface design, feature planning, copywriting, and brainstorming.',
  },
  grind: {
    id: 'grind',
    label: 'Task Sprint',
    icon: Zap,
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/20',
    bgColor: 'bg-cyan-500/5',
    activeBg: 'bg-cyan-500/15',
    activeBorder: 'border-cyan-500/40',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.35)]',
    frequency: 'High Efficiency',
    load: 94,
    intensity: 90,
    depletion: 55,
    gradient: 'from-cyan-500 via-sky-500 to-blue-500',
    blobColor: 'rgba(6,182,212,0.18)',
    pulseSpeed: 1.5,
    description: 'Maximizes work output and task completion speed. Best for administrative tasks, inbox zero, bug triaging, and quick updates.',
  },
  chill: {
    id: 'chill',
    label: 'Mental Recovery',
    icon: Compass,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
    bgColor: 'bg-emerald-500/5',
    activeBg: 'bg-emerald-500/15',
    activeBorder: 'border-emerald-500/40',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.35)]',
    frequency: 'Relaxation',
    load: 18,
    intensity: 40,
    depletion: 4,
    gradient: 'from-emerald-500 via-teal-500 to-green-500',
    blobColor: 'rgba(16,185,129,0.18)',
    pulseSpeed: 8,
    description: 'Promotes active recovery to reduce mental strain. Best for scheduled breaks, screen-free intervals, stretching, or breathing exercises.',
  },
};

const CognitiveCockpit = React.memo(function CognitiveCockpit() {
  const userSettings = useAppStore((s) => s.userSettings);
  const updateUserSettings = useAppStore((s) => s.updateUserSettings);
  const { play } = useSoundFX();
  
  const currentMood = userSettings.mood || 'focused';
  const activeMode = MINDSET_MODES[currentMood as keyof typeof MINDSET_MODES] || MINDSET_MODES.focused;

  const handleModeChange = React.useCallback((modeId: string) => {
    play('success');
    updateUserSettings({ mood: modeId as AppMood });
  }, [play, updateUserSettings]);

  return (
    <div className="w-full glass-card p-6 border border-white/10 rounded-3xl bg-black/40 backdrop-blur-xl relative overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
      {/* Dynamic Background Glowing Blob */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.25, 0.95, 1.1, 1],
            rotate: 360,
            x: [0, 20, -20, 10, 0],
            y: [0, -15, 15, -10, 0],
          }}
          transition={{
            duration: activeMode.pulseSpeed * 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            background: `radial-gradient(circle, ${activeMode.blobColor} 0%, transparent 65%)`,
          }}
          className="absolute -right-24 -top-24 w-96 h-96 blur-3xl"
        />
      </div>

      <div className="relative space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
          <div>
            <h3 className="text-xs font-black text-white/45 uppercase tracking-[0.25em]">Focus & Energy</h3>
            <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Select target focus state for daily planning</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
            <span className="text-[9px] font-black uppercase text-violet-400/80 tracking-widest bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
              State: {activeMode.frequency}
            </span>
          </div>
        </div>

        {/* Cockpit Tuning Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          
          {/* Column 1: Interactive Tuning Buttons */}
          <div className="space-y-2.5">
            <div className="text-[9px] font-black uppercase text-white/30 tracking-widest mb-1.5">Focus Profiles</div>
            {Object.values(MINDSET_MODES).map((mode) => {
              const isActive = mode.id === activeMode.id;
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => handleModeChange(mode.id)}
                  className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all duration-300 relative overflow-hidden group ${
                    isActive
                      ? `${mode.activeBg} ${mode.activeBorder} ${mode.glow} text-white`
                      : `${mode.bgColor} ${mode.borderColor} text-white/40 hover:text-white hover:bg-white/5`
                  }`}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={`p-2 rounded-xl bg-black/40 border border-white/5 transition-all ${
                      isActive ? mode.color : 'text-white/40'
                    }`}>
                      <Icon size={18} strokeWidth={2.5} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider">{mode.label}</span>
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="active-mode-indicator"
                      className={`absolute right-4 w-1.5 h-1.5 rounded-full bg-gradient-to-r ${mode.gradient}`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Column 2: Focus Metrics */}
          <div className="space-y-4.5">
            <div className="text-[9px] font-black uppercase text-white/30 tracking-widest mb-1">Target Metrics</div>
            
            {/* Metric 1: Focus Load */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-white/50">
                  <Cpu size={12} className="text-violet-400" />
                  Focus Load
                </span>
                <span className="text-white font-mono">{activeMode.load}%</span>
              </div>
              <div className="h-2 bg-white/5 border border-white/10 rounded-full overflow-hidden p-[1px]">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: activeMode.load / 100 }}
                  style={{ transformOrigin: 'left', width: '100%' }}
                  transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                  className={`h-full rounded-full bg-gradient-to-r ${activeMode.gradient}`}
                />
              </div>
            </div>

            {/* Metric 2: Sprint Intensity */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-white/50">
                  <Activity size={12} className="text-fuchsia-400" />
                  Sprint Intensity
                </span>
                <span className="text-white font-mono">{activeMode.intensity}%</span>
              </div>
              <div className="h-2 bg-white/5 border border-white/10 rounded-full overflow-hidden p-[1px]">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: activeMode.intensity / 100 }}
                  style={{ transformOrigin: 'left', width: '100%' }}
                  transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                  className={`h-full rounded-full bg-gradient-to-r ${activeMode.gradient}`}
                />
              </div>
            </div>

            {/* Metric 3: Energy Drain */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-white/50">
                  <BatteryCharging size={12} className="text-cyan-400" />
                  Energy Drain
                </span>
                <span className="text-white font-mono">{activeMode.depletion}W/h</span>
              </div>
              <div className="h-2 bg-white/5 border border-white/10 rounded-full overflow-hidden p-[1px]">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: activeMode.depletion / 100 }}
                  style={{ transformOrigin: 'left', width: '100%' }}
                  transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                  className={`h-full rounded-full bg-gradient-to-r ${activeMode.gradient}`}
                />
              </div>
            </div>
          </div>

          {/* Column 3: Immersive Focus Description */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[172px]">
            <div className="absolute top-0 right-0 p-3 opacity-20 pointer-events-none">
              <activeMode.icon size={50} />
            </div>

            <div className="space-y-2 relative z-10">
              <div className="text-[9px] font-black uppercase text-white/30 tracking-widest">Focus Description</div>
              <motion.div
                key={activeMode.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-bold text-white leading-relaxed line-clamp-4 font-medium"
              >
                {activeMode.description}
              </motion.div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 relative z-10">
              <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Profile Active</span>
              <div className="flex gap-0.5 items-end h-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scaleY: [0.33, 1, 0.33],
                    }}
                    style={{ transformOrigin: 'bottom', height: '12px' }}
                    transition={{
                      duration: 0.6 + i * 0.1,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className={`w-0.5 rounded-full bg-gradient-to-t ${activeMode.gradient}`}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
});

export default CognitiveCockpit;
