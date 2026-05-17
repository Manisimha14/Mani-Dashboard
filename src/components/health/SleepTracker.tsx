import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Plus, Trash2, Star } from 'lucide-react';
import { useSleepEntries, useAddSleep, useDeleteSleep, useHealthGoals } from '../../hooks/useHealthQuery';
import type { SleepQuality } from '../../types/health';

function parseSleepMinutes(sleepTime: string, wakeTime: string): number {
  const [sh, sm] = sleepTime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  let mins = (wh * 60 + wm) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins;
}

const EMPTY = { sleepTime: '23:00', wakeTime: '07:00', quality: 4 as SleepQuality, notes: '' };
const QUALITY_LABELS: Record<SleepQuality, string> = { 1: 'Terrible', 2: 'Poor', 3: 'Okay', 4: 'Good', 5: 'Excellent' };
const QUALITY_COLOR: Record<SleepQuality, string> = {
  1: '#f43f5e', 2: '#fb923c', 3: '#facc15', 4: '#34d399', 5: '#22d3ee'
};

export default function SleepTracker({ today }: { today: string }) {
  const { data: sleep = [] } = useSleepEntries();
  const addSleepMut = useAddSleep();
  const deleteSleepMut = useDeleteSleep();
  const { data: goals = [] } = useHealthGoals();

  const addSleep = (entry: any) => addSleepMut.mutate(entry);
  const deleteSleep = (id: string) => deleteSleepMut.mutate(id);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);

  const todaySleep = sleep.find(s => s.date === today);
  const sleepGoalH = goals.find(g => g.type === 'sleep_hours')?.targetValue ?? 8;
  const actualH = todaySleep ? Math.round((todaySleep.totalMinutes / 60) * 10) / 10 : 0;
  const pct = Math.min(actualH / sleepGoalH, 1);

  const previewMinutes = parseSleepMinutes(form.sleepTime, form.wakeTime);
  const previewH = Math.round(previewMinutes / 60 * 10) / 10;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalMinutes = parseSleepMinutes(form.sleepTime, form.wakeTime);
    addSleep({
      date: today,
      sleepTime: form.sleepTime,
      wakeTime: form.wakeTime,
      totalMinutes,
      quality: form.quality,
      notes: form.notes || undefined,
    });
    setShowForm(false);
  };

  const recentSleep = sleep.slice(0, 7);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-600/3 pointer-events-none" />
        <div className="flex items-center gap-8">
          {/* Moon ring */}
          <div className="relative w-36 h-36 flex-shrink-0">
            <svg viewBox="0 0 144 144" className="w-full h-full -rotate-90">
              <defs>
                <linearGradient id="sleepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
              </defs>
              <circle cx="72" cy="72" r="62" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10" />
              <motion.circle cx="72" cy="72" r="62" fill="none"
                stroke="url(#sleepGrad)" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 62}
                initial={{ strokeDashoffset: 2 * Math.PI * 62 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 62 * (1 - pct) }}
                transition={{ duration: 1.5, ease: 'circOut' }}
                style={{ filter: 'drop-shadow(0 0 10px rgba(129,140,248,0.6))' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Moon size={20} className="text-indigo-400 mb-1" />
              {todaySleep ? (
                <>
                  <div className="text-2xl font-black text-white">{actualH}<span className="text-xs text-white/30">h</span></div>
                  <div className="text-[10px] text-white/30">of {sleepGoalH}h goal</div>
                </>
              ) : (
                <div className="text-xs text-white/30 text-center">Not<br/>logged</div>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-4">
            {todaySleep ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Sleep', val: todaySleep.sleepTime, icon: '🌙' },
                    { label: 'Wake', val: todaySleep.wakeTime, icon: '☀️' },
                    { label: 'Quality', val: QUALITY_LABELS[todaySleep.quality], icon: '⭐' },
                  ].map(({ label, val, icon }) => (
                    <div key={label} className="glass-card px-3 py-2.5">
                      <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold">{label}</div>
                      <div className="text-sm font-bold text-white mt-0.5">{icon} {val}</div>
                    </div>
                  ))}
                </div>
                {todaySleep.notes && (
                  <div className="text-xs text-white/30 italic">"{todaySleep.notes}"</div>
                )}
                <button onClick={() => deleteSleep(todaySleep.id)}
                  className="text-xs text-rose-400/60 hover:text-rose-400 transition-colors flex items-center gap-1">
                  <Trash2 size={11} /> Remove today's entry
                </button>
              </>
            ) : (
              <div>
                <div className="text-white/50 font-medium mb-3">No sleep logged for today.</div>
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setShowForm(true)}
                  className="btn-glow px-5 py-2.5 text-sm flex items-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc)' }}
                >
                  <Plus size={16} /> Log Last Night
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="glass-card p-5"
          >
            <div className="text-xs text-white/30 uppercase tracking-widest font-bold mb-4">Log Sleep</div>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Sleep time</label>
                  <input type="time" className="input-glass w-full px-3 py-2 text-sm"
                    value={form.sleepTime} onChange={e => setForm(f => ({ ...f, sleepTime: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Wake time</label>
                  <input type="time" className="input-glass w-full px-3 py-2 text-sm"
                    value={form.wakeTime} onChange={e => setForm(f => ({ ...f, wakeTime: e.target.value }))} />
                </div>
              </div>
              <div className="glass-card px-4 py-2.5 text-sm text-white/50 font-mono">
                Duration: <span className="text-indigo-400 font-bold">{previewH}h</span>
                <span className="text-white/20 text-xs ml-2">({previewMinutes} min)</span>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-2 block">Sleep quality</label>
                <div className="flex gap-2">
                  {([1,2,3,4,5] as SleepQuality[]).map(q => (
                    <button key={q} type="button"
                      onClick={() => setForm(f => ({ ...f, quality: q }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all border
                        ${form.quality === q
                          ? 'text-white border-current shadow-lg'
                          : 'text-white/20 border-white/5 hover:border-white/10'}`}
                      style={form.quality === q ? { color: QUALITY_COLOR[q], borderColor: QUALITY_COLOR[q], background: `${QUALITY_COLOR[q]}15` } : {}}
                    >
                      {q}★
                    </button>
                  ))}
                </div>
                <div className="text-center text-xs mt-1" style={{ color: QUALITY_COLOR[form.quality] }}>
                  {QUALITY_LABELS[form.quality]}
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Notes</label>
                <input className="input-glass w-full px-3 py-2 text-sm"
                  placeholder="e.g. Woke up twice, vivid dreams" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
                <button type="submit" className="btn-glow px-5 py-2 text-sm"
                  style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc)' }}>Log Sleep</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent history */}
      {recentSleep.length > 0 && (
        <div className="glass-card p-5">
          <div className="text-xs text-white/30 uppercase tracking-widest font-bold mb-4">Sleep History</div>
          <div className="space-y-2">
            {recentSleep.map((entry, i) => {
              const h = Math.round(entry.totalMinutes / 60 * 10) / 10;
              const barW = Math.min(h / sleepGoalH, 1);
              return (
                <div key={entry.id} className="flex items-center gap-3">
                  <div className="w-20 text-xs text-white/30 font-mono">{entry.date.slice(5)}</div>
                  <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${barW * 100}%` }}
                      transition={{ delay: i * 0.05, duration: 0.8, ease: 'circOut' }}
                    />
                  </div>
                  <div className="w-12 text-right text-xs font-bold" style={{ color: QUALITY_COLOR[entry.quality] }}>
                    {h}h
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
