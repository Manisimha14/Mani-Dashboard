import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, Trash2, CheckCircle, AlertTriangle, ToggleLeft, ToggleRight } from 'lucide-react';
import { 
  useHealthGoals, useAddGoal, useUpdateGoal, useDeleteGoal, 
  useHealthRestrictions, useAddRestriction, useUpdateRestriction, useDeleteRestriction,
  useTodayHealthData 
} from '../../hooks/useHealthQuery';
import { todayString } from '../../lib/utils';
import type { HealthGoal, HealthRestriction } from '../../types/health';

const EMPTY_GOAL = { label: '', type: 'calories' as HealthGoal['type'], targetValue: '', unit: '' };
const EMPTY_REST = { label: '', type: 'calorie_cap' as HealthRestriction['type'], limitValue: '', unit: '', enabled: true };

const GOAL_PRESETS = [
  { type: 'calories' as const, label: 'Daily Calories', targetValue: 2100, unit: 'kcal' },
  { type: 'water' as const, label: 'Daily Water', targetValue: 3500, unit: 'ml' },
  { type: 'protein' as const, label: 'Daily Protein', targetValue: 120, unit: 'g' },
  { type: 'steps' as const, label: 'Daily Steps', targetValue: 10000, unit: 'steps' },
  { type: 'sleep_hours' as const, label: 'Sleep', targetValue: 8, unit: 'h' },
  { type: 'workouts_per_week' as const, label: 'Workouts / Week', targetValue: 5, unit: 'sessions' },
];

export default function GoalsPanel() {
  const { data: goals = [] } = useHealthGoals();
  const { data: restrictions = [] } = useHealthRestrictions();
  const addGoalMut = useAddGoal();
  const updateGoalMut = useUpdateGoal();
  const deleteGoalMut = useDeleteGoal();
  const addRestMut = useAddRestriction();
  const updateRestMut = useUpdateRestriction();
  const deleteRestMut = useDeleteRestriction();

  const addGoal = (goal: any) => addGoalMut.mutate(goal);
  const updateGoal = (id: string, updates: any) => updateGoalMut.mutate({ id, updates });
  const deleteGoal = (id: string) => deleteGoalMut.mutate(id);
  const addRestriction = (r: any) => addRestMut.mutate(r);
  const updateRestriction = (id: string, updates: any) => updateRestMut.mutate({ id, updates });
  const deleteRestriction = (id: string) => deleteRestMut.mutate(id);

  const [tab, setTab] = useState<'goals' | 'restrictions'>('goals');
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showRestForm, setShowRestForm] = useState(false);
  const [gForm, setGForm] = useState(EMPTY_GOAL);
  const [rForm, setRForm] = useState(EMPTY_REST);

  const todayData = useTodayHealthData();

  function getGoalProgress(goal: HealthGoal): number {
    switch (goal.type) {
      case 'calories': return todayData.totalCalories / goal.targetValue;
      case 'water':    return todayData.totalWaterMl / goal.targetValue;
      case 'protein':  return todayData.totalProtein / goal.targetValue;
      case 'steps':    return todayData.steps / goal.targetValue;
      case 'sleep_hours': return todayData.sleepEntry
        ? (todayData.sleepEntry.totalMinutes / 60) / goal.targetValue : 0;
      case 'workouts_per_week': return todayData.workouts.length > 0 ? 0.2 : 0;
      default: return 0;
    }
  }

  function checkRestriction(r: HealthRestriction): boolean {
    if (!r.enabled) return false;
    switch (r.type) {
      case 'calorie_cap': return todayData.totalCalories > r.limitValue;
      default: return false;
    }
  }

  const submitGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gForm.label || !gForm.targetValue) return;
    const existing = goals.find(g => g.type === gForm.type);
    if (existing) {
      updateGoal(existing.id, { targetValue: Number(gForm.targetValue), label: gForm.label, unit: gForm.unit });
    } else {
      addGoal({ label: gForm.label, type: gForm.type, targetValue: Number(gForm.targetValue), unit: gForm.unit });
    }
    setGForm(EMPTY_GOAL);
    setShowGoalForm(false);
  };

  const submitRest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rForm.label || !rForm.limitValue) return;
    addRestriction({ label: rForm.label, type: rForm.type, limitValue: Number(rForm.limitValue), unit: rForm.unit, enabled: true });
    setRForm(EMPTY_REST);
    setShowRestForm(false);
  };

  return (
    <div className="space-y-5">
      {/* Tab toggle */}
      <div className="flex gap-2">
        {(['goals', 'restrictions'] as const).map(t => (
          <button key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all border capitalize
              ${tab === t
                ? 'text-white border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_16px_rgba(52,211,153,0.2)]'
                : 'text-white/30 border-white/5 hover:text-white/60'}`}
          >
            {t === 'goals' ? '🎯 Goals' : '🚫 Restrictions'}
          </button>
        ))}
      </div>

      {tab === 'goals' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-xs text-white/30 uppercase tracking-widest font-bold">Daily Goals</div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowGoalForm(v => !v)}
              className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5">
              <Plus size={12} /> Add Goal
            </motion.button>
          </div>

          <AnimatePresence>
            {showGoalForm && (
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                className="glass-card p-5">
                <div className="text-xs text-white/30 uppercase tracking-widest font-bold mb-4">New Goal</div>
                <div className="mb-3">
                  <div className="text-xs text-white/30 mb-2">Quick presets:</div>
                  <div className="flex flex-wrap gap-2">
                    {GOAL_PRESETS.map(p => (
                      <button key={p.type} type="button"
                        onClick={() => setGForm({ label: p.label, type: p.type, targetValue: String(p.targetValue), unit: p.unit })}
                        className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors">
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <form onSubmit={submitGoal} className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <input required className="input-glass w-full px-3 py-2 text-sm"
                        placeholder="Goal label" value={gForm.label}
                        onChange={e => setGForm(f => ({ ...f, label: e.target.value }))} />
                    </div>
                    <div>
                      <input required type="number" className="input-glass w-full px-3 py-2 text-sm"
                        placeholder="Target" value={gForm.targetValue}
                        onChange={e => setGForm(f => ({ ...f, targetValue: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowGoalForm(false)} className="btn-ghost px-3 py-1.5 text-sm">Cancel</button>
                    <button type="submit" className="btn-glow px-4 py-1.5 text-sm"
                      style={{ background: 'linear-gradient(135deg, #34d399, #059669)' }}>Add</button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            {goals.map((goal, i) => {
              const raw = getGoalProgress(goal);
              const pct = Math.min(raw, 1);
              const done = raw >= 1;
              return (
                <motion.div key={goal.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`glass-card p-4 border group ${done ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/5'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {done
                        ? <CheckCircle size={14} className="text-emerald-400" />
                        : <Target size={14} className="text-white/30" />}
                      <span className="text-sm font-semibold text-white">{goal.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white/60">
                        {Math.round(pct * 100)}% <span className="text-white/20 font-normal">of {goal.targetValue}{goal.unit}</span>
                      </span>
                      <button onClick={() => deleteGoal(goal.id)}
                        className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-rose-400 transition-all">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full"
                      style={{ background: done ? 'linear-gradient(90deg, #34d399, #059669)' : 'linear-gradient(90deg, #818cf8, #a78bfa)' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(pct * 100)}%` }}
                      transition={{ delay: i * 0.04, duration: 0.9, ease: 'circOut' }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'restrictions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-xs text-white/30 uppercase tracking-widest font-bold">Active Restrictions</div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowRestForm(v => !v)}
              className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5">
              <Plus size={12} /> Add Restriction
            </motion.button>
          </div>

          <AnimatePresence>
            {showRestForm && (
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                className="glass-card p-5">
                <form onSubmit={submitRest} className="space-y-3">
                  <input required className="input-glass w-full px-3 py-2 text-sm"
                    placeholder="Restriction label (e.g. Calorie Cap)" value={rForm.label}
                    onChange={e => setRForm(f => ({ ...f, label: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-3">
                    <input required type="number" className="input-glass w-full px-3 py-2 text-sm"
                      placeholder="Limit value" value={rForm.limitValue}
                      onChange={e => setRForm(f => ({ ...f, limitValue: e.target.value }))} />
                    <input className="input-glass w-full px-3 py-2 text-sm"
                      placeholder="Unit (kcal, g, cups…)" value={rForm.unit}
                      onChange={e => setRForm(f => ({ ...f, unit: e.target.value }))} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowRestForm(false)} className="btn-ghost px-3 py-1.5 text-sm">Cancel</button>
                    <button type="submit" className="btn-glow px-4 py-1.5 text-sm"
                      style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)' }}>Add</button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            {restrictions.map((r, i) => {
              const breached = checkRestriction(r);
              return (
                <motion.div key={r.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`glass-card p-4 border group flex items-center justify-between
                    ${breached ? 'border-rose-500/30 bg-rose-500/5' : r.enabled ? 'border-white/5' : 'border-white/3 opacity-50'}`}>
                  <div className="flex items-center gap-3">
                    {breached
                      ? <AlertTriangle size={16} className="text-rose-400 animate-pulse" />
                      : <Target size={16} className="text-white/30" />}
                    <div>
                      <div className="text-sm font-semibold text-white">{r.label}</div>
                      <div className={`text-xs mt-0.5 ${breached ? 'text-rose-400' : 'text-white/30'}`}>
                        {breached ? '⚠️ Limit exceeded!' : `Max ${r.limitValue} ${r.unit}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateRestriction(r.id, { enabled: !r.enabled })}
                      className="transition-colors">
                      {r.enabled
                        ? <ToggleRight size={22} className="text-emerald-400" />
                        : <ToggleLeft size={22} className="text-white/20" />}
                    </button>
                    <button onClick={() => deleteRestriction(r.id)}
                      className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-rose-400 transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
