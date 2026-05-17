import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Plus, Trash2, Timer, Flame } from 'lucide-react';
import { useWorkouts, useAddWorkout, useDeleteWorkout } from '../../hooks/useHealthQuery';
import type { WorkoutType } from '../../types/health';

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
  const addWorkoutMut           = useAddWorkout();
  const deleteWorkoutMut        = useDeleteWorkout();
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);

  const todayWorkouts = workouts; // already filtered by date from the hook
  const totalMin    = todayWorkouts.reduce((a, w) => a + w.durationMinutes, 0);
  const totalBurned = todayWorkouts.reduce((a, w) => a + (w.caloriesBurned ?? 0), 0);

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

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Sessions', val: todayWorkouts.length, unit: '', icon: '💪', color: '#fb923c' },
          { label: 'Total Time', val: totalMin, unit: 'min', icon: '⏱️', color: '#a78bfa' },
          { label: 'Cals Burned', val: totalBurned, unit: 'kcal', icon: '🔥', color: '#f43f5e' },
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
    </div>
  );
}
