import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets, Plus, Trash2, Waves } from 'lucide-react';
import { useWater, useHealthGoals, useAddWater, useDeleteWater } from '../../hooks/useHealthQuery';
import { todayString } from '../../lib/utils';
import { useSoundFX } from '../../hooks/useSoundFX';

const QUICK_ADD_CONFIG = [
  { amount: 150, label: 'Cup', icon: '🥛' },
  { amount: 250, label: 'Glass', icon: '🥤' },
  { amount: 350, label: 'Bottle', icon: '🍼' },
  { amount: 500, label: 'Flask', icon: '🧊' },
];

export default function WaterTracker({ today }: { today: string }) {
  const { data: water = [] }  = useWater(today);
  const { data: goals = [] }  = useHealthGoals();
  const addWaterMut           = useAddWater();
  const deleteWaterMut        = useDeleteWater();
  const [customMl, setCustomMl] = useState('');
  const { play } = useSoundFX();

  const todayWater = water; // already filtered by date from the hook
  const totalMl = todayWater.reduce((a, w) => a + w.amount, 0);
  const goalMl  = goals.find(g => g.type === 'water')?.targetValue ?? 3500;
  const pct = Math.min(totalMl / goalMl, 1);

  const now = () => new Date().toTimeString().slice(0, 5);

  const log = (ml: number) => {
    if (ml <= 0) return;
    play('success');
    addWaterMut.mutate({ date: today, time: now(), amount: ml });
    setCustomMl('');
  };

  return (
    <div className="space-y-6">
      {/* Hero Ring */}
      <div className="glass-card p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-sky-600/3 pointer-events-none" />

        <div className="flex items-center gap-10">
          {/* Animated fill ring */}
          <div className="relative w-44 h-44 flex-shrink-0">
            {/* Wave fill visual */}
            <div className="absolute inset-3 rounded-full overflow-hidden"
              style={{ border: '3px solid rgba(34,211,238,0.15)' }}>
              <motion.div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-500/60 to-cyan-400/30"
                initial={{ height: '0%' }}
                animate={{ height: `${Math.round(pct * 100)}%` }}
                transition={{ duration: 1.5, ease: 'circOut' }}
              />

              {/* Floating Bubbles */}
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute bg-white/20 rounded-full"
                  style={{
                    width: Math.random() * 6 + 3,
                    height: Math.random() * 6 + 3,
                    left: `${Math.random() * 80 + 10}%`,
                    bottom: '0%'
                  }}
                  animate={{
                    bottom: ['0%', '100%'],
                    x: [0, Math.random() * 16 - 8, 0],
                    opacity: [0, 0.7, 0]
                  }}
                  transition={{
                    duration: Math.random() * 2.5 + 1.5,
                    repeat: Infinity,
                    delay: Math.random() * 1.5,
                    ease: 'easeInOut'
                  }}
                />
              ))}

              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <Droplets size={22} className="text-cyan-400 mb-1" />
                <div className="text-2xl font-black text-white">
                  {(totalMl / 1000).toFixed(1)}<span className="text-sm text-white/40 ml-0.5">L</span>
                </div>
                <div className="text-xs text-white/30">of {goalMl / 1000}L goal</div>
              </div>
            </div>

            {/* Ring progress */}
            <svg viewBox="0 0 176 176" className="w-full h-full -rotate-90 absolute inset-0">
              <circle cx="88" cy="88" r="80" fill="none"
                stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
              <motion.circle cx="88" cy="88" r="80" fill="none"
                stroke="#22d3ee" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 80}
                initial={{ strokeDashoffset: 2 * Math.PI * 80 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 80 * (1 - pct) }}
                transition={{ duration: 1.5, ease: 'circOut' }}
                style={{ filter: 'drop-shadow(0 0 10px rgba(34,211,238,0.6))' }}
              />
            </svg>
          </div>

          <div className="flex-1 space-y-6">
            <div>
              <div className="text-xs text-white/30 uppercase tracking-widest font-bold mb-2">Quick Add Vessel</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {QUICK_ADD_CONFIG.map(vessel => (
                  <motion.button
                    key={vessel.amount}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => log(vessel.amount)}
                    className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10 hover:border-cyan-500/30
                               text-cyan-400 flex flex-col items-center justify-center gap-1 transition-all"
                  >
                    <span className="text-2xl">{vessel.icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/40">{vessel.label}</span>
                    <span className="text-xs font-bold">+{vessel.amount}ml</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs text-white/30 uppercase tracking-widest font-bold mb-1">Custom Amount</div>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="e.g. 750"
                  value={customMl}
                  onChange={e => setCustomMl(e.target.value)}
                  className="input-glass px-3 py-2 text-sm w-32 font-mono"
                />
                <span className="text-white/30 self-center text-sm">ml</span>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => log(Number(customMl))}
                  className="btn-glow px-4 py-2 text-sm flex items-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg, #0891b2, #0e7490)' }}
                >
                  <Plus size={14} /> Log
                </motion.button>
              </div>
            </div>

            {/* Macro progress */}
            <div>
              <div className="flex justify-between text-xs text-white/30 mb-1">
                <span>Progress</span>
                <span>{Math.round(pct * 100)}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(pct * 100)}%` }}
                  transition={{ duration: 1.5, ease: 'circOut' }}
                />
              </div>
              <div className="text-xs text-white/20 mt-1">
                {Math.max(0, goalMl - totalMl)}ml remaining to hit goal
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Log */}
      <div className="glass-card p-5">
        <div className="text-xs text-white/30 uppercase tracking-widest font-bold mb-4">Today's Log</div>
        {todayWater.length === 0 ? (
          <div className="text-center py-8 text-white/20">
            <Waves size={32} className="mx-auto mb-2 opacity-30" />
            <div>No water logged yet today.</div>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {todayWater.map(entry => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl
                             bg-cyan-500/5 border border-cyan-500/10 group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">💧</span>
                    <div>
                      <span className="text-sm font-semibold text-cyan-300">+{entry.amount}ml</span>
                      <span className="text-xs text-white/30 ml-2">{entry.time}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      play('click');
                      deleteWaterMut.mutate(entry.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity
                               text-white/20 hover:text-rose-400 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
