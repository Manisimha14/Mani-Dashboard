import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { useAchievements } from '../hooks/useAchievementQuery';
import type { Achievement } from '../types';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1 } };

const RARITY_STYLES: Record<Achievement['rarity'], { border: string; glow: string; badge: string }> = {
  common: { border: 'border-white/10', glow: '', badge: 'bg-white/10 text-white/40' },
  rare: { border: 'border-blue-500/30', glow: 'shadow-[0_0_20px_rgba(59,130,246,0.2)]', badge: 'bg-blue-500/20 text-blue-400' },
  epic: { border: 'border-violet-500/40', glow: 'shadow-[0_0_25px_rgba(139,92,246,0.3)]', badge: 'bg-violet-500/20 text-violet-400' },
  legendary: { border: 'border-amber-500/40', glow: 'shadow-[0_0_30px_rgba(245,158,11,0.3)]', badge: 'bg-amber-500/20 text-amber-400' },
};

const CATEGORY_LABELS = { reading: '📖 Reading', coding: '💻 Coding', focus: '🌳 Focus', streak: '🔥 Streak', general: '⚡ General' };

export default function Achievements() {
  const { data: achievements = [] } = useAchievements();
  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);
  const { xp = 0, level = 1, xpLedger = [] } = useAppStore();

  const byCategory = Object.entries(CATEGORY_LABELS).map(([cat, label]) => ({
    category: cat as Achievement['category'],
    label,
    items: achievements.filter(a => a.category === cat),
  }));

  const currentLevelXp = xp % 1000;
  const xpPct = (currentLevelXp / 1000) * 100;
  const nextLevelXp = 1000 - currentLevelXp;

  return (
    <div className="max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Achievements</h1>
          <p className="text-white/40 mt-1 text-sm">
            <span className="text-violet-400 font-semibold">{unlocked.length}</span> of {achievements.length} unlocked
          </p>
        </div>
        <div className="flex items-center gap-3 bg-violet-500/10 border border-violet-500/20 px-4 py-2 rounded-xl">
          <span className="text-xs font-black uppercase tracking-wider text-violet-400">Total OS Level</span>
          <span className="text-2xl font-black italic text-white drop-shadow-[0_0_10px_rgba(139,92,246,0.6)]">Lvl {level}</span>
        </div>
      </div>

      {/* Spectacular RPG Leveling Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card md:col-span-2 p-6 relative overflow-hidden flex flex-col justify-between border-violet-500/20 bg-black/60 shadow-2xl">
          <div className="absolute top-0 right-0 w-60 h-60 bg-violet-600/5 blur-[100px] pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <span className="text-sm font-black uppercase tracking-widest text-white/80">Experience Engine</span>
              </div>
              <span className="text-xs font-mono text-violet-400 font-bold">{xp} / {(level) * 1000} XP</span>
            </div>
            
            <div className="h-4 bg-white/5 border border-white/10 rounded-full overflow-hidden mb-3 p-[2px]">
              <motion.div 
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 shadow-[0_0_15px_rgba(139,92,246,0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${xpPct}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            
            <div className="flex items-center justify-between text-[11px] text-white/40 font-mono">
              <span>LEVEL {level}</span>
              <span>{nextLevelXp} XP TO LEVEL {level + 1}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-white/5">
            <div className="text-center">
              <div className="text-[10px] text-white/30 uppercase tracking-widest">Solved DSA</div>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">+{unlocked.filter(a => a.category === 'coding').length * 150} XP</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-white/30 uppercase tracking-widest">Focus Time</div>
              <div className="text-lg font-bold text-violet-400 mt-0.5">+{unlocked.filter(a => a.category === 'focus').length * 200} XP</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-white/30 uppercase tracking-widest">Reading Clear</div>
              <div className="text-lg font-bold text-amber-400 mt-0.5">+{unlocked.filter(a => a.category === 'reading').length * 200} XP</div>
            </div>
          </div>
        </div>

        {/* Dynamic XP Ledger Widget */}
        <div className="glass-card p-5 border-white/10 bg-black/40 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white/60 mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
              XP TRANSACTION LEDGER
            </h3>
            <div className="space-y-2 max-h-[140px] overflow-y-auto custom-scrollbar">
              {xpLedger.length === 0 ? (
                <div className="text-center py-8 text-xs font-mono text-white/20">
                  No experience transactions logged yet.
                </div>
              ) : (
                xpLedger.slice(0, 4).map((entry) => (
                  <div key={entry.id} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-white/5 border border-white/5 font-mono text-[10px] leading-tight">
                    <div className="min-w-0">
                      <span className="text-violet-400 font-bold uppercase mr-1.5">[{entry.source}]</span>
                      <span className="text-white/60 truncate inline-block max-w-[130px] align-bottom">{entry.description}</span>
                    </div>
                    <span className="text-emerald-400 font-black shrink-0 font-sans">+{entry.amount}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="text-[9px] font-mono text-white/30 uppercase text-right border-t border-white/5 pt-2.5 mt-2">
            Ledger Audit OK
          </div>
        </div>
      </div>

      {/* Progress Banner */}
      <div className="glass-card p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-transparent" />
        <div className="relative flex flex-col md:flex-row items-center md:items-center gap-6">
          <div className="text-5xl">🏆</div>
          <div className="flex-1">
            <div className="text-lg font-bold text-white mb-2">Achievement Progress</div>
            <div className="progress-bar mb-1">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${(unlocked.length / achievements.length) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <div className="text-sm text-white/40">{unlocked.length}/{achievements.length} achievements unlocked</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 gap-2 w-full md:w-auto">
            {(['common', 'rare', 'epic', 'legendary'] as Achievement['rarity'][]).map(r => {
              const count = unlocked.filter(a => a.rarity === r).length;
              const total = achievements.filter(a => a.rarity === r).length;
              return (
                <div key={r} className={`px-3 py-1.5 rounded-lg ${RARITY_STYLES[r].badge} text-xs font-medium capitalize`}>
                  {r}: {count}/{total}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* By Category */}
      {byCategory.map(({ category, label, items }) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">{label}</h3>
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {items.map(ach => (
              <motion.div key={ach.id} variants={item}>
                <AchievementCard achievement={ach} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      ))}
    </div>
  );
}

function AchievementCard({ achievement: ach }: { achievement: Achievement }) {
  const styles = RARITY_STYLES[ach.rarity];
  const progressPct = ach.target ? Math.min((ach.progress || 0) / ach.target * 100, 100) : 0;

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={`glass-card p-4 flex flex-col items-center gap-2 text-center border transition-all duration-500 relative overflow-hidden group ${
        ach.unlocked ? 'border-violet-500/30 bg-violet-500/5' : 'border-white/5 opacity-50 grayscale'
      } hover:border-violet-500/50`}
    >
      {ach.unlocked && (
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
      )}
      
      <div className={`text-4xl mb-2 transition-transform duration-500 group-hover:scale-110 ${ach.unlocked ? 'drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]' : ''}`}>
        {ach.icon}
      </div>
      
      <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] font-intel border ${styles.badge}`}>
        {ach.rarity}
      </div>
      
      <div className={`text-sm font-black italic uppercase tracking-tight mt-1 ${ach.unlocked ? 'text-white' : 'text-white/40'}`}>
        {ach.title}
      </div>
      
      <div className="text-[10px] text-white/30 leading-relaxed font-medium max-w-xs">
        {ach.description}
      </div>

      {ach.target && !ach.unlocked && (
        <div className="w-full mt-4 bg-white/5 h-1 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            className="h-full bg-violet-500"
          />
        </div>
      )}
      {ach.unlocked && ach.unlockedAt && (
        <div className="text-[8px] text-violet-400/60 mt-1 uppercase tracking-widest font-intel">
          Mission Clear: {ach.unlockedAt}
        </div>
      )}
    </motion.div>
  );
}
