import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Footprints, Plus, Trash2, Edit2, Check, X, Award } from 'lucide-react';
import { useSteps, useLogSteps, useHealthGoals, useAddGoal, useUpdateGoal, useAddWorkout } from '../../hooks/useHealthQuery';
import { useSoundFX } from '../../hooks/useSoundFX';
import { useAuth } from '../../contexts/AuthContext';
import { fetchTodayGoogleFitData } from '../../services/googleFit.service';

export default function StepsTracker({ today }: { today: string }) {
  const { user } = useAuth();
  const { data: stepsData = {} } = useSteps();
  const { data: goals = [] } = useHealthGoals();
  const logStepsMut = useLogSteps();
  const addWorkoutMut = useAddWorkout();
  const addGoalMut = useAddGoal();
  const updateGoalMut = useUpdateGoal();
  const { play } = useSoundFX();

  const [customSteps, setCustomSteps] = useState('');
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoalVal, setTempGoalVal] = useState('');

  const [isSyncingFit, setIsSyncingFit] = useState(false);
  const [syncStepIndex, setSyncStepIndex] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const fitSyncResultRef = React.useRef<{ steps: number; calories: number; activeMinutes: number } | null>(null);

  const todaySteps = stepsData[today] ?? 0;
  const stepsGoal = goals.find(g => g.type === 'steps')?.targetValue ?? 10000;
  const pct = Math.min(todaySteps / stepsGoal, 1);

  const saveGoal = () => {
    const val = Number(tempGoalVal);
    if (!val || val <= 0) return;
    play('click');
    const existing = goals.find(g => g.type === 'steps');
    if (existing) {
      updateGoalMut.mutate({ id: existing.id, updates: { targetValue: val } });
    } else {
      addGoalMut.mutate({ label: 'Daily Steps', type: 'steps', targetValue: val, unit: 'steps' });
    }
    setIsEditingGoal(false);
  };

  const startFitSync = async () => {
    if (!user) {
      setSyncError('Sign in with Google before requesting Google Fit data.');
      return;
    }
    setIsSyncingFit(true);
    setSyncStepIndex(0);
    setSyncError(null);
    fitSyncResultRef.current = null;
    play('click');

    try {
      const data = await fetchTodayGoogleFitData();
      fitSyncResultRef.current = data;
      // Proactively trigger mutations immediately in the background for zero-latency updates
      logStepsMut.mutate({ date: today, steps: data.steps });
      addWorkoutMut.mutate({
        date: today,
        startTime: '08:30',
        name: 'Google Fit Synced Walk',
        type: 'walking',
        durationMinutes: data.activeMinutes,
        caloriesBurned: data.calories,
        notes: 'Imported steps and movement duration from Google Fit API.'
      });
    } catch (err: any) {
      console.error('Failed to fetch Google Fit data:', err);
      setTimeout(() => {
        setIsSyncingFit(false);
        setSyncError(err.message || 'Unknown Google Fit API error occurred.');
        play('click');
      }, 1200);
    }
  };

  // Sync step sequencer animation
  useEffect(() => {
    if (!isSyncingFit) return;
    const timer = setInterval(() => {
      setSyncStepIndex(prev => {
        if (prev >= 3) {
          clearInterval(timer);
          
          setTimeout(() => {
            setIsSyncingFit(false);
            play('success');
          }, 300);
          return prev;
        }
        play('click');
        return prev + 1;
      });
    }, 250); // High performance, snappy 250ms transition intervals

    return () => clearInterval(timer);
  }, [isSyncingFit]);

  const handleLogSteps = (amount: number) => {
    if (amount < 0) return;
    play('success');
    logStepsMut.mutate({ date: today, steps: amount });
  };

  const quickAdd = (addAmount: number) => {
    handleLogSteps(todaySteps + addAmount);
  };

  // Generate last 7 days of steps
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = stepsData[dateStr] ?? 0;
    // Format date as "Mon 18"
    const formattedDate = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    return { date: dateStr, label: formattedDate, count };
  }).reverse();

  return (
    <div className="space-y-6">
      {syncError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5 relative overflow-hidden"
        >
          <span className="text-sm">⚠️</span>
          <div className="flex-1">
            <span className="font-bold">Sync Failed: </span>
            {syncError}
          </div>
          <button
            onClick={() => setSyncError(null)}
            className="text-white/30 hover:text-white/60 transition-colors p-1 absolute top-2 right-2"
          >
            <X size={12} />
          </button>
        </motion.div>
      )}

      {/* Google Fit Integration Card */}
      <div className="glass-card p-5 relative overflow-hidden bg-gradient-to-r from-blue-500/5 to-emerald-500/5 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xl">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-white/60">Google Fit Sync</span>
              {user ? (
                <span className="flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" /> Signed in
                </span>
              ) : (
                <span className="text-[9px] bg-white/5 text-white/30 border border-white/5 px-1.5 py-0.5 rounded-full font-bold">
                  Google sign-in required
                </span>
              )}
            </div>
            <p className="text-xs text-white/40 mt-0.5">
              Pull real step and movement totals from the current Google-authenticated session. No local fake authorization state is used.
            </p>
          </div>
        </div>

        <div className="flex gap-2.5">
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={startFitSync}
            disabled={!user}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/25 flex items-center gap-1.5 hover:bg-blue-500/20 transition-all shadow-[0_0_12px_rgba(59,130,246,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔄 Sync from Google Fit
          </motion.button>
        </div>
      </div>
      {/* Hero Ring */}
      <div className="glass-card p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-600/3 pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center gap-10">
          {/* Animated fill ring */}
          <div className="relative w-44 h-44 flex-shrink-0">
            <svg viewBox="0 0 176 176" className="w-full h-full -rotate-90">
              <circle cx="88" cy="88" r="80" fill="none"
                stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
              <motion.circle cx="88" cy="88" r="80" fill="none"
                stroke="#34d399" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 80}
                initial={{ strokeDashoffset: 2 * Math.PI * 80 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 80 * (1 - pct) }}
                transition={{ duration: 1.5, ease: 'circOut' }}
                style={{ filter: 'drop-shadow(0 0 10px rgba(52,211,153,0.6))' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Footprints size={22} className="text-emerald-400 mb-1" />
              <div className="text-2xl font-black text-white">
                {todaySteps.toLocaleString()}
              </div>
              
              {isEditingGoal ? (
                <div className="flex items-center gap-1 mt-1 z-10">
                  <input
                    type="number"
                    value={tempGoalVal}
                    onChange={e => setTempGoalVal(e.target.value)}
                    className="input-glass px-1.5 py-0.5 text-xs w-16 font-bold text-center"
                    placeholder="10000"
                    autoFocus
                  />
                  <button onClick={saveGoal} className="p-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                    <Check size={10} />
                  </button>
                  <button onClick={() => setIsEditingGoal(false)} className="p-1 rounded bg-white/5 text-white/40">
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <div className="text-xs text-white/30 flex items-center gap-1">
                  <span>of {stepsGoal.toLocaleString()} goal</span>
                  <button
                    onClick={() => { setTempGoalVal(String(stepsGoal)); setIsEditingGoal(true); }}
                    className="text-white/20 hover:text-white/50 transition-colors p-0.5"
                  >
                    <Edit2 size={10} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 w-full space-y-6">
            <div>
              <div className="text-xs text-white/30 uppercase tracking-widest font-bold mb-2">Quick Add Steps</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { amount: 1000, label: 'Short Walk' },
                  { amount: 2500, label: 'Power Walk' },
                  { amount: 5000, label: 'Long Stroll' },
                  { amount: 10000, label: 'Daily Goal' },
                ].map(item => (
                  <motion.button
                    key={item.amount}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => quickAdd(item.amount)}
                    className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/30
                               text-emerald-400 flex flex-col items-center justify-center gap-1 transition-all"
                  >
                    <span className="text-lg">👟</span>
                    <span className="text-[9px] font-black uppercase tracking-wider text-white/40">{item.label}</span>
                    <span className="text-xs font-bold">+{item.amount.toLocaleString()}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs text-white/30 uppercase tracking-widest font-bold mb-1">Set Steps Directly</div>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="e.g. 8450"
                  value={customSteps}
                  onChange={e => setCustomSteps(e.target.value)}
                  className="input-glass px-3 py-2 text-sm w-36 font-mono"
                />
                <span className="text-white/30 self-center text-sm">steps</span>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    handleLogSteps(Number(customSteps));
                    setCustomSteps('');
                  }}
                  className="btn-glow px-4 py-2 text-sm flex items-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}
                >
                  <Plus size={14} /> Update Today
                </motion.button>
              </div>
            </div>

            {/* Steps progress */}
            <div>
              <div className="flex justify-between text-xs text-white/30 mb-1">
                <span>Progress</span>
                <span>{Math.round(pct * 100)}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(pct * 100)}%` }}
                  transition={{ duration: 1.5, ease: 'circOut' }}
                />
              </div>
              {todaySteps >= stepsGoal ? (
                <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                  <Award size={12} /> Congratulations! Daily steps target achieved!
                </div>
              ) : (
                <div className="text-xs text-white/20 mt-1">
                  {Math.max(0, stepsGoal - todaySteps).toLocaleString()} steps remaining to hit your goal
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="glass-card p-5">
        <div className="text-xs text-white/30 uppercase tracking-widest font-bold mb-4">Last 7 Days Activity</div>
        <div className="flex items-end justify-between h-36 gap-2 pt-4 px-2">
          {last7Days.map((day, idx) => {
            const isTargetMet = day.count >= stepsGoal;
            const barHeight = stepsGoal > 0 ? Math.min(day.count / stepsGoal, 1.2) : 0;
            const isToday = day.date === today;

            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                <div className="relative w-full flex flex-col items-center justify-end h-full">
                  {/* Tooltip */}
                  <div className="absolute -top-6 scale-0 group-hover:scale-100 transition-transform duration-150 bg-black/80 border border-white/10 text-white text-[10px] font-bold px-2 py-0.5 rounded-md pointer-events-none z-20 whitespace-nowrap shadow-xl">
                    {day.count.toLocaleString()} steps
                  </div>
                  
                  {/* Bar */}
                  <motion.div
                    className={`w-full rounded-t-lg transition-all duration-300 relative ${
                      isToday 
                        ? 'bg-gradient-to-t from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                        : isTargetMet
                        ? 'bg-emerald-500/80 group-hover:bg-emerald-500'
                        : 'bg-white/10 group-hover:bg-white/20'
                    }`}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.round(barHeight * 100 * 0.75)}%` }} // keep some padding for height
                    transition={{ delay: idx * 0.05, duration: 0.8, ease: 'circOut' }}
                  >
                    {isTargetMet && (
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-emerald-400 flex items-center justify-center border border-black shadow-[0_0_6px_rgba(52,211,153,0.6)]">
                        <Check size={8} className="text-black font-black" />
                      </div>
                    )}
                  </motion.div>
                </div>
                <div className={`text-[10px] font-medium tracking-tight ${isToday ? 'text-emerald-400 font-bold' : 'text-white/30'}`}>
                  {day.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Google Fit Sync Steps Modal */}
      <AnimatePresence>
        {isSyncingFit && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="w-full max-w-sm bg-[#1c1d21] border border-white/10 rounded-3xl p-6 shadow-[0_24px_50px_rgba(0,0,0,0.5)] text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-emerald-500/5 pointer-events-none" />

              {/* Sync spinning ring */}
              <div className="relative w-16 h-16 mx-auto mb-5 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full animate-spin">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="url(#googleFitGrad)" strokeWidth="6" strokeDasharray="250" strokeDashoffset="170" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="googleFitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4285F4" />
                      <stop offset="50%" stopColor="#EA4335" />
                      <stop offset="100%" stopColor="#34A853" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute text-xl animate-pulse">⚡</span>
              </div>

              <h3 className="text-sm font-black text-white mb-0.5">Google Fit Syncing</h3>
              <p className="text-[10px] text-white/30 mb-5">Retrieving cloud activity telemetry</p>

              {/* Check list */}
              <div className="space-y-2.5 text-left mb-2">
                {[
                  'Authorizing current Google session...',
                  'Pulling today step telemetry...',
                  'Extracting active movement duration...',
                  'Synchronizing verified data...'
                ].map((text, idx) => {
                  const isDone = syncStepIndex > idx;
                  const isActive = syncStepIndex === idx;

                  return (
                    <div key={idx} className={`flex items-center gap-2.5 transition-opacity duration-300 ${isDone ? 'opacity-100' : isActive ? 'opacity-100 animate-pulse' : 'opacity-25'}`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black border ${
                        isDone 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' 
                          : isActive 
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/20' 
                          : 'bg-white/5 text-white/20 border-white/5'
                      }`}>
                        {isDone ? '✓' : idx + 1}
                      </div>
                      <span className={`text-[11px] ${isDone ? 'text-emerald-400 font-semibold' : isActive ? 'text-white font-semibold' : 'text-white/30'}`}>
                        {text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
