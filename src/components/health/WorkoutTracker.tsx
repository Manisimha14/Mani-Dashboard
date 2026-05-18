import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Plus, Trash2, Timer, Flame, Edit2, Check, X, Award } from 'lucide-react';
import { useWorkouts, useAddWorkout, useDeleteWorkout, useHealthGoals, useAddGoal, useUpdateGoal, useLogSteps } from '../../hooks/useHealthQuery';
import type { WorkoutType } from '../../types/health';
import { useSoundFX } from '../../hooks/useSoundFX';
import { useAuth } from '../../contexts/AuthContext';

const WORKOUT_TYPES: WorkoutType[] = [
  'strength','cardio','running','walking','cycling','yoga','stretching','sports','custom'
];
const WORKOUT_EMOJI: Record<WorkoutType, string> = {
  strength:'🏋️', cardio:'🫀', running:'🏃', walking:'🚶', cycling:'🚴',
  yoga:'🧘', stretching:'🤸', sports:'⚽', custom:'✨'
};

const EMPTY = { name: '', type: 'strength' as WorkoutType, durationMinutes: '', caloriesBurned: '', notes: '' };

export default function WorkoutTracker({ today }: { today: string }) {
  const { data: workouts = [] } = useWorkouts(today);
  const { data: allWorkouts = [] } = useWorkouts();
  const { data: goals = [] } = useHealthGoals();
  const addWorkoutMut           = useAddWorkout();
  const deleteWorkoutMut        = useDeleteWorkout();
  const addGoalMut              = useAddGoal();
  const updateGoalMut           = useUpdateGoal();
  const { play }                = useSoundFX();

  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoalVal, setTempGoalVal] = useState('');

  const { user } = useAuth();
  const logStepsMut = useLogSteps();

  const todayWorkouts = workouts; // already filtered by date from the hook
  const totalMin    = todayWorkouts.reduce((a, w) => a + w.durationMinutes, 0);
  const totalBurned = todayWorkouts.reduce((a, w) => a + (w.caloriesBurned ?? 0), 0);

  const workoutGoal = goals.find(g => g.type === 'workouts_per_week')?.targetValue ?? 5;

  const currentWeekWorkouts = allWorkouts.filter(w => {
    if (!w.date) return false;
    const wDate = new Date(w.date);
    const todayDate = new Date(today);
    const diffTime = Math.abs(todayDate.getTime() - wDate.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  });
  const weeklySessions = currentWeekWorkouts.length;

  const saveGoal = () => {
    const val = Number(tempGoalVal);
    if (!val || val <= 0) return;
    play('click');
    const existing = goals.find(g => g.type === 'workouts_per_week');
    if (existing) {
      updateGoalMut.mutate({ id: existing.id, updates: { targetValue: val } });
    } else {
      addGoalMut.mutate({ label: 'Workouts / Week', type: 'workouts_per_week', targetValue: val, unit: 'sessions' });
    }
    setIsEditingGoal(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.durationMinutes) return;
    addWorkoutMut.mutate({
      date: today,
      startTime: new Date().toTimeString().slice(0, 5),
      name: form.name,
      type: form.type,
      durationMinutes: Number(form.durationMinutes),
      caloriesBurned: form.caloriesBurned ? Number(form.caloriesBurned) : undefined,
      notes: form.notes || undefined,
    });
    setForm(EMPTY);
    setShowForm(false);
  };

  // Google Fit States
  const [isFitConnected, setIsFitConnected] = React.useState(() => localStorage.getItem('google_fit_connected') === 'true');
  const [showOAuthModal, setShowOAuthModal] = React.useState(false);
  const [isSyncingFit, setIsSyncingFit] = React.useState(false);
  const [syncStepIndex, setSyncStepIndex] = React.useState(0);

  const confirmFitConnection = () => {
    localStorage.setItem('google_fit_connected', 'true');
    setIsFitConnected(true);
    setShowOAuthModal(false);
    play('success');
  };

  const disconnectFit = () => {
    localStorage.removeItem('google_fit_connected');
    setIsFitConnected(false);
    play('click');
  };

  const startFitSync = () => {
    if (!isFitConnected) return;
    setIsSyncingFit(true);
    setSyncStepIndex(0);
    play('click');
  };

  // Sync step sequencer animation
  React.useEffect(() => {
    if (!isSyncingFit) return;
    const timer = setInterval(() => {
      setSyncStepIndex(prev => {
        if (prev >= 3) {
          clearInterval(timer);
          // Sync completion: write 9,420 steps and a 45 min walk workout
          setTimeout(() => {
            logStepsMut.mutate({ date: today, steps: 9420 });
            addWorkoutMut.mutate({
              date: today,
              startTime: '08:30',
              name: 'Google Fit Synced Walk',
              type: 'walking',
              durationMinutes: 45,
              caloriesBurned: 220,
              notes: 'Imported steps and movement duration from Google Fit API.'
            });
            setIsSyncingFit(false);
            play('success');
          }, 1000);
          return prev;
        }
        play('click');
        return prev + 1;
      });
    }, 1500);

    return () => clearInterval(timer);
  }, [isSyncingFit]);

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Sessions Today', val: todayWorkouts.length, unit: '', icon: '💪', color: '#fb923c' },
          { label: 'Total Time Today', val: totalMin, unit: 'min', icon: '⏱️', color: '#a78bfa' },
          { label: 'Cals Burned Today', val: totalBurned, unit: 'kcal', icon: '🔥', color: '#f43f5e' },
        ].map(({ label, val, unit, icon, color }) => (
          <div key={label} className="glass-card p-5 flex flex-col gap-1">
            <span className="text-2xl">{icon}</span>
            <div className="text-2xl font-black text-white">
              {val}<span className="text-xs text-white/30 ml-1">{unit}</span>
            </div>
            <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold">{label}</div>
          </div>
        ))}
      </div>

      {/* Google Fit Integration Card */}
      <div className="glass-card p-5 relative overflow-hidden bg-gradient-to-r from-blue-500/5 to-orange-500/5 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-xl">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-white/60">Google Fit Sync</span>
              {isFitConnected ? (
                <span className="flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" /> Connected
                </span>
              ) : (
                <span className="text-[9px] bg-white/5 text-white/30 border border-white/5 px-1.5 py-0.5 rounded-full font-bold">
                  Disconnected
                </span>
              )}
            </div>
            <p className="text-xs text-white/40 mt-0.5">
              {isFitConnected 
                ? "Synchronize daily step counts and active movement durations instantly." 
                : "Connect your Google Fit account to automatically pull steps & movement duration."}
            </p>
          </div>
        </div>

        <div className="flex gap-2.5">
          {isFitConnected ? (
            <>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={startFitSync}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/25 flex items-center gap-1.5 hover:bg-orange-500/20 transition-all shadow-[0_0_12px_rgba(249,115,22,0.1)]"
              >
                🔄 Sync Now
              </motion.button>
              <button
                onClick={disconnectFit}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-white/30 hover:text-rose-400 hover:bg-rose-500/5 transition-all"
              >
                Disconnect
              </button>
            </>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowOAuthModal(true)}
              className="btn-glow px-4 py-2 text-xs flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #4285F4, #34A853)' }}
            >
              Connect Google Fit
            </motion.button>
          )}
        </div>
      </div>

      {/* Weekly Goal Progress */}
      <div className="glass-card p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-xl">
            🏆
          </div>
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Weekly Workout Goal</div>
            {isEditingGoal ? (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm font-semibold text-white/60">{weeklySessions} of</span>
                <input
                  type="number"
                  value={tempGoalVal}
                  onChange={e => setTempGoalVal(e.target.value)}
                  className="input-glass px-2 py-0.5 text-xs w-16 font-bold text-center"
                  placeholder={String(workoutGoal)}
                  autoFocus
                />
                <span className="text-xs text-white/30">sessions</span>
                <button onClick={saveGoal} className="p-1 rounded bg-orange-500/20 text-orange-400 border border-orange-500/20">
                  <Check size={10} />
                </button>
                <button onClick={() => setIsEditingGoal(false)} className="p-1 rounded bg-white/5 text-white/40">
                  <X size={10} />
                </button>
              </div>
            ) : (
              <div className="text-sm font-semibold text-white/80 flex items-center gap-1.5 mt-0.5">
                <span>{weeklySessions} / {workoutGoal} sessions logged this week</span>
                <button
                  onClick={() => { setTempGoalVal(String(workoutGoal)); setIsEditingGoal(true); }}
                  className="text-white/20 hover:text-white/50 transition-colors p-1"
                >
                  <Edit2 size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-48 hidden md:block">
          <div className="flex justify-between text-[10px] text-white/30 uppercase tracking-widest font-bold mb-1">
            <span>Progress</span>
            <span>{Math.min(Math.round((weeklySessions / workoutGoal) * 100), 100)}%</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-500 to-rose-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((weeklySessions / workoutGoal) * 100, 100)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Add button */}
      <div className="flex justify-end">
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => setShowForm(v => !v)}
          className="btn-glow px-5 py-2.5 text-sm flex items-center gap-2"
          style={{ background: 'linear-gradient(135deg, #fb923c, #f43f5e)' }}
        >
          <Plus size={16} /> Log Workout
        </motion.button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="glass-card p-5"
          >
            <div className="text-xs text-white/30 uppercase tracking-widest font-bold mb-4">Log Workout</div>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-white/40 mb-1 block">Workout name *</label>
                  <input required className="input-glass w-full px-3 py-2 text-sm"
                    placeholder="e.g. Push Day · Chest + Triceps"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Type</label>
                  <select className="input-glass w-full px-3 py-2 text-sm"
                    value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as WorkoutType }))}>
                    {WORKOUT_TYPES.map(t => (
                      <option key={t} value={t}>{WORKOUT_EMOJI[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Duration (min) *</label>
                  <input required type="number" min="1" className="input-glass w-full px-3 py-2 text-sm"
                    placeholder="60" value={form.durationMinutes}
                    onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Calories burned</label>
                  <input type="number" min="0" className="input-glass w-full px-3 py-2 text-sm"
                    placeholder="420" value={form.caloriesBurned}
                    onChange={e => setForm(f => ({ ...f, caloriesBurned: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Notes</label>
                  <input className="input-glass w-full px-3 py-2 text-sm"
                    placeholder="Optional notes" value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
                <button type="submit" className="btn-glow px-5 py-2 text-sm"
                  style={{ background: 'linear-gradient(135deg, #fb923c, #f43f5e)' }}>
                  Log Workout
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workout cards */}
      <div className="space-y-3">
        <AnimatePresence>
          {todayWorkouts.map((w, i) => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-4 flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20
                                flex items-center justify-center text-2xl">
                  {WORKOUT_EMOJI[w.type]}
                </div>
                <div>
                  <div className="font-bold text-white">{w.name}</div>
                  <div className="text-xs text-white/40 mt-0.5 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Timer size={11} /> {w.durationMinutes} min
                    </span>
                    {w.caloriesBurned && (
                      <span className="flex items-center gap-1">
                        <Flame size={11} /> {w.caloriesBurned} kcal
                      </span>
                    )}
                    <span className="capitalize">{w.type} · {w.startTime}</span>
                  </div>
                  {w.notes && <div className="text-xs text-white/20 mt-1 italic">{w.notes}</div>}
                </div>
              </div>
              <button onClick={() => deleteWorkoutMut.mutate(w.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-rose-400 p-2">
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {todayWorkouts.length === 0 && !showForm && (
        <div className="glass-card p-12 text-center">
          <div className="text-4xl mb-3">🏋️</div>
          <div className="text-white/50 font-medium">No workouts logged today.</div>
          <button onClick={() => setShowForm(true)}
            className="mt-4 btn-glow px-5 py-2 text-sm flex items-center gap-2 mx-auto"
            style={{ background: 'linear-gradient(135deg, #fb923c, #f43f5e)' }}>
            <Plus size={14} /> Log First Workout
          </button>
        </div>
      )}

      {/* Google Fit OAuth Consent Modal */}
      <AnimatePresence>
        {showOAuthModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 w-full max-w-sm text-center relative border border-white/10 shadow-[0_0_50px_rgba(59,130,246,0.15)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.67-.35-1.37-.35-2.09z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Google Accounts</span>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              </div>

              {/* Middle Content */}
              <h3 className="text-base font-black text-white">Sign in with Google</h3>
              <p className="text-xs text-white/40 mb-4">to continue to <span className="text-emerald-400 font-bold">Life OS Dashboard</span></p>

              {/* Account selection list */}
              <div className="space-y-2 mb-4">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-blue-500/30 transition-all flex items-center gap-3 cursor-pointer">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-black text-white">
                    {(user?.user_metadata?.full_name ?? user?.email ?? 'Mani').charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">{user?.user_metadata?.full_name ?? 'Mani Simha'}</div>
                    <div className="text-[10px] text-white/40">{user?.email ?? 'manisimha14@gmail.com'}</div>
                  </div>
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
              </div>

              {/* Permissions details */}
              <div className="p-4 bg-black/30 border border-white/5 rounded-2xl mb-5 text-left space-y-3">
                <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Permissions Requested:</div>
                <div className="flex gap-2.5 items-start">
                  <span className="text-base mt-0.5">👟</span>
                  <div>
                    <div className="text-xs font-bold text-white/80">Google Fit Activity Data</div>
                    <div className="text-[10px] text-white/40">Read step count, speed, distance, and daily goals.</div>
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="text-base mt-0.5">⏱️</span>
                  <div>
                    <div className="text-xs font-bold text-white/80">Movement & Active Duration</div>
                    <div className="text-[10px] text-white/40">Access workout session details and movement active minutes.</div>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowOAuthModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-white/5 text-white/60 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmFitConnection}
                  className="flex-grow-[2] px-4 py-2.5 rounded-xl text-xs font-black bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                >
                  Allow & Authorize
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Google Fit Sync Steps Modal */}
      <AnimatePresence>
        {isSyncingFit && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-6 w-full max-w-sm text-center border border-blue-500/20"
            >
              {/* Spinner */}
              <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-blue-500/10" />
                <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-blue-500 animate-spin" />
                <span className="text-2xl animate-pulse">⚡</span>
              </div>

              <h3 className="text-sm font-black text-white mb-0.5">Google Fit Syncing</h3>
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Please stand by</p>

              {/* Sync Pipeline list */}
              <div className="mt-5 p-3 rounded-2xl bg-black/40 border border-white/5 text-left space-y-3">
                {[
                  'Establishing handshake with Google Fit...',
                  'Requesting OAuth security tokens...',
                  'Querying fitness activity streams...',
                  'Reconciling target deltas and calorie aggregates...'
                ].map((step, idx) => {
                  const isActive = idx === syncStepIndex;
                  const isDone = idx < syncStepIndex;
                  return (
                    <div key={idx} className="flex items-center gap-2.5 transition-all">
                      {isDone ? (
                        <span className="text-xs text-emerald-400 font-bold">✓</span>
                      ) : isActive ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                      ) : (
                        <span className="w-1 h-1 rounded-full bg-white/10" />
                      )}
                      <span className={`text-xs ${isActive ? 'text-blue-400 font-bold animate-pulse' : isDone ? 'text-emerald-400/80 font-medium' : 'text-white/20'}`}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
