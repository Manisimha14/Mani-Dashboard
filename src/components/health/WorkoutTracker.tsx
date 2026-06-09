import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Plus, Trash2, Timer, Flame, Edit2, Check, X, Award } from 'lucide-react';
import { useWorkouts, useAddWorkout, useDeleteWorkout, useHealthGoals, useAddGoal, useUpdateGoal, useLogSteps } from '../../hooks/useHealthQuery';
import type { WorkoutType } from '../../types/health';
import { useSoundFX } from '../../hooks/useSoundFX';
import { useAuth } from '../../contexts/AuthContext';
import { fetchTodayGoogleFitData, getGoogleFitSyncFeedback, type GoogleFitSyncFeedback } from '../../services/googleFit.service';

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

  const { user, reconnectGoogleFit } = useAuth();
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

  const [isSyncingFit, setIsSyncingFit] = React.useState(false);
  const [syncStepIndex, setSyncStepIndex] = React.useState(0);
  const [syncError, setSyncError] = React.useState<GoogleFitSyncFeedback | null>(null);
  const [showTroubleshoot, setShowTroubleshoot] = React.useState(false);

  // Unified sync workout name with legacy variant cleanup for reliable deduplication
  const SYNC_WORKOUT_NAME = 'Daily Activity Sync';

  const startFitSync = async () => {
    if (!user) {
      setSyncError({
        code: 'auth',
        message: 'Sign in with Google before requesting Google Fit data. No health data was synced.',
        canReconnect: true,
        canTroubleshoot: false,
      });
      return;
    }
    setIsSyncingFit(true);
    setSyncStepIndex(0);
    setSyncError(null);
    setShowTroubleshoot(false);
    play('click');

    try {
      setSyncStepIndex(1); play('click');
      const data = await fetchTodayGoogleFitData();

      setSyncStepIndex(2); play('click');
      logStepsMut.mutate({ date: today, steps: data.steps });

      // Delete any existing sync workout for today (regardless of name variant)
      const existingSync = todayWorkouts.find(w =>
        w.name === SYNC_WORKOUT_NAME ||
        w.name === 'Google Fit Synced Walk' ||
        w.name === 'Google Fit Synced Walk (Simulated)'
      );
      if (existingSync) deleteWorkoutMut.mutate(existingSync.id);

      setSyncStepIndex(3); play('click');
      addWorkoutMut.mutate({
        date: today,
        startTime: '08:30',
        name: SYNC_WORKOUT_NAME,
        type: 'walking',
        durationMinutes: data.activeMinutes,
        caloriesBurned: data.calories,
        notes: `Synced from Google Fit — ${data.steps.toLocaleString()} steps, ${data.activeMinutes} active minutes.`
      });

      setSyncStepIndex(4);
      setTimeout(() => { setIsSyncingFit(false); play('success'); }, 600);
    } catch (err: any) {
      console.error('Failed to fetch Google Fit data:', err);
      setIsSyncingFit(false);
      setSyncError(getGoogleFitSyncFeedback(err));
      play('click');
    }
  };

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

      {syncError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5 relative overflow-hidden"
        >
          <span className="text-sm">⚠️</span>
          <div className="flex-1 pr-6">
            <span className="font-bold">Google Fit Sync Failed</span>
            <span className="block mt-0.5 whitespace-pre-wrap text-rose-300">{syncError.message}</span>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  play('click');
                  setSyncError(null);
                  setShowTroubleshoot(false);
                  startFitSync();
                }}
                className="px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/35 border border-orange-500/30 text-white font-bold transition-all text-[11px] flex items-center gap-1.5 cursor-pointer"
              >
                Retry Sync
              </button>
              {syncError.canReconnect && (
                <button
                  onClick={() => { play('click'); reconnectGoogleFit(); }}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/30 text-white font-bold transition-all text-[11px] flex items-center gap-1.5 cursor-pointer"
                >
                  ⚡ Reconnect Google Fit
                </button>
              )}
              {syncError.canTroubleshoot && (
                <button
                  onClick={() => {
                    play('click');
                    setShowTroubleshoot(value => !value);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold transition-all text-[11px] flex items-center gap-1.5 cursor-pointer"
                >
                  Troubleshoot
                </button>
              )}
            </div>
            {showTroubleshoot && (
              <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-white/65 space-y-1">
                <div>Health metrics are unavailable until a real sync succeeds.</div>
                <div>Deploy the server-side `sync-google-fit` function and keep Google OAuth refresh credentials configured.</div>
                <div>If this environment still surfaces CSP errors, allow `www.googleapis.com`, `oauth2.googleapis.com`, and `accounts.google.com` in `connect-src`.</div>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setSyncError(null);
              setShowTroubleshoot(false);
            }}
            className="text-white/30 hover:text-white/60 transition-colors p-1 absolute top-2 right-2 cursor-pointer"
          >
            <X size={12} />
          </button>
        </motion.div>
      )}

      {/* Google Fit Integration Card */}
      <div className="glass-card p-5 relative overflow-hidden bg-gradient-to-r from-blue-500/5 to-orange-500/5 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-xl">
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
              Pull validated movement totals through the secure server-side Google Fit sync path.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={startFitSync}
            disabled={!user}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/25 flex items-center gap-1.5 hover:bg-orange-500/20 transition-all shadow-[0_0_12px_rgba(249,115,22,0.1)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            🔄 Sync from Google Fit
          </motion.button>
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
