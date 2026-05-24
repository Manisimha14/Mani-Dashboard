import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Code2,
  Crown,
  Flame,
  HeartPulse,
  Lock,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  Trophy,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useAchievements } from '../hooks/useAchievementQuery';
import { useProblems } from '../hooks/useLeetCodeQuery';
import { useFocusSessions } from '../hooks/useFocusQuery';
import { useProfile } from '../hooks/useProfileQuery';
import { useHealthGoals, useWater } from '../hooks/useHealthQuery';
import type { Achievement } from '../types';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const RARITY_STYLES: Record<Achievement['rarity'], { border: string; badge: string; glow: string }> = {
  common: { border: 'border-white/10', badge: 'bg-white/10 text-white/45', glow: '' },
  rare: { border: 'border-cyan-500/30', badge: 'bg-cyan-500/15 text-cyan-300', glow: 'shadow-[0_0_24px_rgba(34,211,238,0.12)]' },
  epic: { border: 'border-violet-500/35', badge: 'bg-violet-500/15 text-violet-300', glow: 'shadow-[0_0_28px_rgba(139,92,246,0.16)]' },
  legendary: { border: 'border-amber-500/35', badge: 'bg-amber-500/15 text-amber-300', glow: 'shadow-[0_0_32px_rgba(245,158,11,0.18)]' },
};

const CATEGORY_LABELS: Record<Achievement['category'], string> = {
  reading: 'Reading',
  coding: 'Coding',
  focus: 'Focus',
  streak: 'Streaks',
  general: 'General',
  health: 'Health',
  learning: 'Learning',
};

const XP_BY_RARITY: Record<Achievement['rarity'], number> = {
  common: 120,
  rare: 260,
  epic: 450,
  legendary: 800,
};

const XP_LANES = [
  { id: 'focus', label: 'Focus XP', icon: Brain, accent: 'from-violet-500/20 to-fuchsia-500/10', text: 'text-violet-300' },
  { id: 'health', label: 'Health XP', icon: HeartPulse, accent: 'from-emerald-500/20 to-cyan-500/10', text: 'text-emerald-300' },
  { id: 'coding', label: 'Coding XP', icon: Code2, accent: 'from-cyan-500/20 to-blue-500/10', text: 'text-cyan-300' },
  { id: 'learning', label: 'Learning XP', icon: ScrollText, accent: 'from-amber-500/20 to-orange-500/10', text: 'text-amber-300' },
] as const;

const TIERS = [
  { label: 'Bronze', minXp: 0, accent: 'text-amber-500' },
  { label: 'Silver', minXp: 1200, accent: 'text-slate-300' },
  { label: 'Gold', minXp: 3200, accent: 'text-yellow-300' },
  { label: 'Platinum', minXp: 6200, accent: 'text-cyan-300' },
  { label: 'Legend', minXp: 10000, accent: 'text-violet-300' },
] as const;

function lastSevenDateStrings() {
  const days: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    days.push(day.toISOString().split('T')[0]);
  }
  return days;
}

function achievementXpCategory(achievement: Achievement): 'focus' | 'health' | 'coding' | 'learning' | 'meta' {
  if (achievement.xpCategory) return achievement.xpCategory;
  if (achievement.category === 'focus' || achievement.category === 'streak') return 'focus';
  if (achievement.category === 'coding') return 'coding';
  if (achievement.category === 'reading' || achievement.category === 'learning') return 'learning';
  if (achievement.category === 'health') return 'health';
  return 'meta';
}

export default function Achievements() {
  const { data: achievements = [] } = useAchievements();
  const { data: problems = [] } = useProblems();
  const { data: focusSessions = [] } = useFocusSessions();
  const { data: profile } = useProfile();
  const { data: waterEntries = [] } = useWater();
  const { data: healthGoals = [] } = useHealthGoals();
  const { xp = 0, level = 1, xpLedger = [] } = useAppStore();

  const unlocked = achievements.filter((achievement) => achievement.unlocked);
  const currentTier = [...TIERS].reverse().find((tier) => xp >= tier.minXp) ?? TIERS[0];
  const nextTier = TIERS.find((tier) => tier.minXp > xp) ?? null;

  const xpByLane = useMemo(() => {
    const base = { focus: 0, health: 0, coding: 0, learning: 0, meta: 0 };
    unlocked.forEach((achievement) => {
      const lane = achievementXpCategory(achievement);
      base[lane] += achievement.xpReward ?? XP_BY_RARITY[achievement.rarity];
    });
    return base;
  }, [unlocked]);

  const categoryGroups = useMemo(() => {
    return Object.entries(CATEGORY_LABELS)
      .map(([category, label]) => ({
        category: category as Achievement['category'],
        label,
        items: achievements.filter((achievement) => achievement.category === category),
      }))
      .filter((group) => group.items.length > 0);
  }, [achievements]);

  const currentLevelXp = xp % 1000;
  const xpPct = Math.min((currentLevelXp / 1000) * 100, 100);
  const last7Days = useMemo(() => lastSevenDateStrings(), []);
  const waterGoalMl = healthGoals.find((goal) => goal.type === 'water')?.targetValue ?? 3000;

  const maxFocusDayHours = useMemo(() => {
    const byDate = focusSessions
      .filter((session) => session.completed)
      .reduce((acc, session) => {
        const minutes = session.actualDuration || session.duration;
        acc.set(session.date, (acc.get(session.date) ?? 0) + minutes);
        return acc;
      }, new Map<string, number>());
    return Math.max(0, ...Array.from(byDate.values()).map((minutes) => minutes / 60));
  }, [focusSessions]);

  const bestStreak = Math.max(
    profile?.focusStreak?.longestStreak ?? 0,
    profile?.codingStreak?.longestStreak ?? 0,
    profile?.readingStreak?.longestStreak ?? 0,
  );

  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const monthSolveCount = problems.filter((problem) => problem.completed && problem.date.startsWith(currentMonthPrefix)).length;

  const hydrationPerfectDays = useMemo(() => {
    return last7Days.filter((date) => {
      const total = waterEntries
        .filter((entry) => entry.date === date)
        .reduce((sum, entry) => sum + entry.amount, 0);
      return total >= waterGoalMl;
    }).length;
  }, [last7Days, waterEntries, waterGoalMl]);

  const bossChallenges = [
    {
      id: 'deep-work-day',
      title: '10 Hour Deep Work Day',
      description: 'Log a single 10-hour day of completed focus.',
      progress: Math.min(maxFocusDayHours, 10),
      target: 10,
      suffix: 'h',
      unlocked: maxFocusDayHours >= 10,
      accent: 'from-violet-500/20 to-fuchsia-500/10',
    },
    {
      id: 'thirty-day-streak',
      title: '30-Day Streak',
      description: 'Reach a 30-day streak in any core discipline.',
      progress: Math.min(bestStreak, 30),
      target: 30,
      suffix: 'd',
      unlocked: bestStreak >= 30,
      accent: 'from-amber-500/20 to-orange-500/10',
    },
    {
      id: 'hundred-problems-month',
      title: '100 Problems Month',
      description: 'Ship 100 validated coding solves in a single month.',
      progress: Math.min(monthSolveCount, 100),
      target: 100,
      suffix: '',
      unlocked: monthSolveCount >= 100,
      accent: 'from-cyan-500/20 to-blue-500/10',
    },
    {
      id: 'hydration-perfection',
      title: 'Hydration Perfection Week',
      description: 'Hit your water target on all 7 days of the week.',
      progress: Math.min(hydrationPerfectDays, 7),
      target: 7,
      suffix: '/7',
      unlocked: hydrationPerfectDays >= 7,
      accent: 'from-emerald-500/20 to-cyan-500/10',
    },
  ];

  const hiddenCount = achievements.filter((achievement) => !achievement.unlocked && (achievement.secret || achievement.rarity === 'legendary')).length
    + bossChallenges.filter((challenge) => !challenge.unlocked).length;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <div className="glass-card p-6 md:p-7 border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/5 relative overflow-hidden">
          <div className="absolute -top-12 right-0 w-56 h-56 rounded-full bg-violet-500/10 blur-[90px] pointer-events-none" />
          <div className="flex items-start justify-between gap-4 relative">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-300">Achievement Forge</div>
              <h1 className="text-3xl font-black text-white tracking-tight mt-2">RPG Progression Layer</h1>
              <p className="text-sm text-white/45 font-semibold mt-2 max-w-2xl">
                Unlocks, tiers, and boss quests are now framed as progression systems instead of a static badge gallery.
              </p>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-black/30 border border-white/10 text-right">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Current Tier</div>
              <div className={`text-xl font-black mt-1 ${currentTier.accent}`}>{currentTier.label}</div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[0.18em] text-white/40 mb-3">
              <span>Level {level}</span>
              <span>{xp} XP total</span>
            </div>
            <div className="h-4 rounded-full bg-white/5 border border-white/10 overflow-hidden p-[2px]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400 shadow-[0_0_18px_rgba(139,92,246,0.4)]"
                initial={{ width: 0 }}
                animate={{ width: `${xpPct}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-white/35 font-semibold mt-3">
              <span>{currentLevelXp} XP into this level</span>
              <span>{1000 - currentLevelXp} XP to level {level + 1}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-6">
            {XP_LANES.map((lane) => {
              const Icon = lane.icon;
              const value = xpByLane[lane.id] ?? 0;
              return (
                <div key={lane.id} className={`rounded-2xl border border-white/8 bg-gradient-to-br ${lane.accent} p-4`}>
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={lane.text} />
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">{lane.label}</span>
                  </div>
                  <div className={`text-2xl font-black mt-3 ${lane.text}`}>{value}</div>
                  <div className="text-[11px] text-white/35 font-semibold mt-1">Unlocked progression XP</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card p-6 border-white/10 bg-black/30">
          <div className="flex items-center gap-2 mb-4">
            <Crown size={14} className="text-amber-300" />
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200/80">Tier Progression</span>
          </div>
          <div className="space-y-3">
            {TIERS.map((tier, index) => {
              const unlockedTier = xp >= tier.minXp;
              const isCurrent = currentTier.label === tier.label;
              return (
                <div
                  key={tier.label}
                  className={`rounded-2xl border px-4 py-3 transition-all ${
                    isCurrent
                      ? 'border-violet-500/35 bg-violet-500/10'
                      : unlockedTier
                      ? 'border-white/10 bg-white/[0.03]'
                      : 'border-white/5 bg-white/[0.015]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${unlockedTier ? 'bg-white/8' : 'bg-black/20'}`}>
                        {unlockedTier ? <Shield size={14} className={tier.accent} /> : <Lock size={14} className="text-white/25" />}
                      </div>
                      <div>
                        <div className={`text-sm font-black ${unlockedTier ? tier.accent : 'text-white/35'}`}>{tier.label}</div>
                        <div className="text-[11px] text-white/35 font-semibold">{tier.minXp} XP threshold</div>
                      </div>
                    </div>
                    {isCurrent ? <span className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">Current</span> : null}
                  </div>
                  {index < TIERS.length - 1 ? <div className="mt-3 h-px bg-white/5" /> : null}
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-xs text-white/35 font-semibold">
            {nextTier ? `${nextTier.minXp - xp} XP needed to reach ${nextTier.label}.` : 'Top tier reached.'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-6">
        <div className="glass-card p-6 border-white/10 bg-black/25">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-200/80">Boss Achievements</div>
              <h2 className="text-xl font-black text-white mt-2">Live Endgame Quests</h2>
            </div>
            <Swords size={18} className="text-rose-300" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bossChallenges.map((challenge) => {
              const pct = Math.min((challenge.progress / challenge.target) * 100, 100);
              return (
                <motion.div
                  key={challenge.id}
                  whileHover={{ y: -4 }}
                  className={`rounded-3xl border p-5 bg-gradient-to-br ${challenge.accent} ${challenge.unlocked ? 'border-amber-400/30 shadow-[0_0_26px_rgba(251,191,36,0.14)]' : 'border-white/8'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-black text-white">{challenge.title}</div>
                    {challenge.unlocked ? <Sparkles size={16} className="text-amber-300 animate-pulse" /> : <Flame size={16} className="text-white/35" />}
                  </div>
                  <p className="text-xs text-white/45 font-semibold leading-relaxed mt-2">{challenge.description}</p>
                  <div className="flex items-end justify-between gap-3 mt-4">
                    <div className="text-2xl font-black text-white">
                      {challenge.progress}
                      <span className="text-sm text-white/40 ml-1">{challenge.suffix}</span>
                    </div>
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white/35">
                      {challenge.unlocked ? 'Cleared' : `${Math.round(pct)}%`}
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-black/20 border border-white/8 overflow-hidden p-[1px] mt-3">
                    <div className="h-full rounded-full bg-gradient-to-r from-white via-white/80 to-white/60" style={{ width: `${Math.max(4, pct)}%` }} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="glass-card p-6 border-white/10 bg-black/25">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Secret Archive</div>
              <h2 className="text-xl font-black text-white mt-2">Hidden Unlocks</h2>
            </div>
            <Lock size={16} className="text-white/35" />
          </div>
          <p className="text-sm text-white/45 font-semibold mt-2">
            {hiddenCount} hidden or legendary unlocks are still sealed.
          </p>
          <div className="grid grid-cols-1 gap-3 mt-5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-white/55">Secret Achievement #{index + 1}</div>
                  <div className="text-[11px] text-white/30 font-semibold mt-1">Unlock condition intentionally hidden until closer to completion.</div>
                </div>
                <Lock size={14} className="text-white/25" />
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-white/5 pt-4">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35 mb-3">Recent XP Ledger</div>
            <div className="space-y-2 max-h-[178px] overflow-y-auto custom-scrollbar">
              {xpLedger.length === 0 ? (
                <div className="text-xs text-white/25 font-semibold py-6 text-center">No XP transactions logged yet.</div>
              ) : (
                xpLedger.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">{entry.source}</div>
                      <div className="text-xs text-white/45 font-semibold mt-1 truncate">{entry.description}</div>
                    </div>
                    <div className="text-sm font-black text-emerald-300 shrink-0">+{entry.amount}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 border-white/10 bg-black/25">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Achievement Progress</div>
            <h2 className="text-xl font-black text-white mt-2">{unlocked.length} of {achievements.length} unlocked</h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/35">
            <Trophy size={14} className="text-amber-300" />
            <span>Real unlock state only</span>
          </div>
        </div>
        <div className="h-3 rounded-full bg-white/5 border border-white/8 overflow-hidden p-[1px]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-violet-500 to-cyan-400"
            initial={{ width: 0 }}
            animate={{ width: `${achievements.length > 0 ? (unlocked.length / achievements.length) * 100 : 0}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      {categoryGroups.map((group) => (
        <div key={group.category}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/55">{group.label}</h3>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/30">
              {group.items.filter((achievement) => achievement.unlocked).length}/{group.items.length} unlocked
            </span>
          </div>
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {group.items.map((achievement) => (
              <motion.div key={achievement.id} variants={item}>
                <AchievementCard achievement={achievement} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      ))}
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const styles = RARITY_STYLES[achievement.rarity];
  const progressPct = achievement.target ? Math.min(((achievement.progress || 0) / achievement.target) * 100, 100) : 0;
  const tierLabel = achievement.tier ?? (
    achievement.rarity === 'legendary' ? 'legend'
      : achievement.rarity === 'epic' ? 'platinum'
      : achievement.rarity === 'rare' ? 'silver'
      : 'bronze'
  );

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className={`glass-card p-5 border relative overflow-hidden ${achievement.unlocked ? `${styles.border} ${styles.glow} bg-white/[0.04]` : 'border-white/6 bg-white/[0.02] opacity-80'}`}
    >
      {achievement.unlocked ? (
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.06),transparent)] translate-x-[-120%] hover:translate-x-[120%] transition-transform duration-1000 pointer-events-none" />
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="text-4xl">{achievement.unlocked ? achievement.icon : '❖'}</div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-2 py-1 rounded-full border text-[9px] font-black uppercase tracking-[0.18em] ${styles.badge}`}>
            {achievement.rarity}
          </span>
          <span className="text-[9px] font-black uppercase tracking-[0.18em] text-white/25">
            {tierLabel}
          </span>
        </div>
      </div>

      <div className={`mt-4 text-base font-black tracking-tight ${achievement.unlocked ? 'text-white' : 'text-white/55'}`}>{achievement.title}</div>
      <div className="text-xs text-white/40 font-semibold leading-relaxed mt-2">{achievement.description}</div>

      {achievement.target ? (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.14em] text-white/30 mb-2">
            <span>Progress</span>
            <span>{achievement.progress || 0}/{achievement.target}</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden border border-white/8 p-[1px]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(achievement.unlocked ? 100 : 4, progressPct)}%` }}
              className={`h-full rounded-full ${achievement.unlocked ? 'bg-gradient-to-r from-amber-400 to-violet-500' : 'bg-gradient-to-r from-violet-500 to-cyan-400'}`}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.14em]">
        <span className="text-white/28">{CATEGORY_LABELS[achievement.category]}</span>
        <span className={achievement.unlocked ? 'text-emerald-300' : 'text-white/25'}>
          {achievement.unlocked ? 'Unlocked' : achievement.secret ? 'Secret' : 'Locked'}
        </span>
      </div>
      {achievement.unlocked && achievement.unlockedAt ? (
        <div className="text-[10px] text-violet-300/70 font-semibold mt-2">Unlocked {achievement.unlockedAt}</div>
      ) : null}
    </motion.div>
  );
}
