import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Droplets, Dumbbell, Moon, Footprints, Scale, Zap } from 'lucide-react';
import type { HealthState, HealthGoal } from '../../types/health';
import { computeHealthScore } from '../../store/useHealthStore';
import { useTodayHealthData } from '../../hooks/useHealthQuery';

interface Props {
  todayData: ReturnType<typeof useTodayHealthData>;
  goals: HealthGoal[];
  today: string;
}

export default function HealthOverview({ todayData, goals, today }: Props) {
  const calorieGoal = goals.find(g => g.type === 'calories')?.targetValue ?? 2100;
  const waterGoal   = goals.find(g => g.type === 'water')?.targetValue   ?? 3500;
  const proteinGoal = goals.find(g => g.type === 'protein')?.targetValue ?? 120;
  const sleepGoal   = goals.find(g => g.type === 'sleep_hours')?.targetValue ?? 8;
  const stepsGoal   = goals.find(g => g.type === 'steps')?.targetValue   ?? 10000;

  const score = computeHealthScore(
    todayData.totalCalories, calorieGoal,
    todayData.totalWaterMl, waterGoal,
    todayData.totalProtein, proteinGoal,
    todayData.sleepEntry?.totalMinutes ?? 0, sleepGoal,
    todayData.workouts.length > 0
  );

  const metrics = [
    {
      label: 'Calories',
      value: todayData.totalCalories,
      goal: calorieGoal,
      unit: 'kcal',
      icon: Flame,
      color: '#f43f5e',
      glow: 'rgba(244,63,94,0.5)',
      gradient: ['#f43f5e', '#fb923c'],
    },
    {
      label: 'Water',
      value: Math.round(todayData.totalWaterMl / 100) / 10,
      goal: waterGoal / 1000,
      unit: 'L',
      icon: Droplets,
      color: '#22d3ee',
      glow: 'rgba(34,211,238,0.5)',
      gradient: ['#22d3ee', '#38bdf8'],
    },
    {
      label: 'Protein',
      value: Math.round(todayData.totalProtein),
      goal: proteinGoal,
      unit: 'g',
      icon: Zap,
      color: '#a78bfa',
      glow: 'rgba(167,139,250,0.5)',
      gradient: ['#a78bfa', '#818cf8'],
    },
    {
      label: 'Steps',
      value: todayData.steps,
      goal: stepsGoal,
      unit: 'steps',
      icon: Footprints,
      color: '#34d399',
      glow: 'rgba(52,211,153,0.5)',
      gradient: ['#34d399', '#6ee7b7'],
    },
    {
      label: 'Sleep',
      value: todayData.sleepEntry ? Math.round((todayData.sleepEntry.totalMinutes / 60) * 10) / 10 : 0,
      goal: sleepGoal,
      unit: 'h',
      icon: Moon,
      color: '#818cf8',
      glow: 'rgba(129,140,248,0.5)',
      gradient: ['#818cf8', '#c084fc'],
    },
    {
      label: 'Workout',
      value: todayData.totalWorkoutMinutes,
      goal: 60,
      unit: 'min',
      icon: Dumbbell,
      color: '#fb923c',
      glow: 'rgba(251,146,60,0.5)',
      gradient: ['#fb923c', '#fbbf24'],
    },
  ];

  // Timeline events
  const timelineItems = [
    ...todayData.meals.map(m => ({
      time: m.time, label: m.name,
      sub: `${m.mealType} · ${m.calories} kcal`, color: '#f43f5e', emoji: '🍽️'
    })),
    ...todayData.water.map(w => ({
      time: w.time, label: `Water +${w.amount}ml`,
      sub: 'Hydration log', color: '#22d3ee', emoji: '💧'
    })),
    ...todayData.workouts.map(w => ({
      time: w.startTime, label: w.name,
      sub: `${w.type} · ${w.durationMinutes} min`, color: '#fb923c', emoji: '💪'
    })),
    ...(todayData.sleepEntry ? [{
      time: todayData.sleepEntry.wakeTime, label: 'Woke up',
      sub: `${Math.round(todayData.sleepEntry.totalMinutes / 60 * 10) / 10}h sleep`, color: '#818cf8', emoji: '😴'
    }] : []),
  ].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="space-y-6">
      {/* Performance Score */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-pink-600/3 pointer-events-none" />
        <div className="flex items-center gap-8">
          {/* Score Ring */}
          <div className="relative w-32 h-32 flex-shrink-0">
            <motion.div
              animate={{ scale: [1, 1.05, 1], opacity: [0.15, 0.3, 0.15] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 rounded-full"
              style={{ background: `radial-gradient(circle, rgba(244,63,94,0.3), transparent 70%)` }}
            />
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <defs>
                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#fb923c" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="42" fill="none"
                stroke="rgba(255,255,255,0.04)" strokeWidth="10" />
              <motion.circle cx="50" cy="50" r="42" fill="none"
                stroke="url(#scoreGrad)" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 42}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - score / 100) }}
                transition={{ duration: 1.5, ease: 'circOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-3xl font-black text-white"
              >{score}</motion.span>
              <span className="text-[9px] text-white/30 uppercase tracking-widest font-bold">/100</span>
            </div>
          </div>

          <div className="flex-1">
            <div className="text-xs text-white/30 uppercase tracking-widest font-bold mb-1">
              Today's Performance
            </div>
            <div className="text-xl font-black text-white mb-3">
              {score >= 80 ? '🔥 Peak Performance' : score >= 60 ? '⚡ On Track' : score >= 40 ? '🌱 Building Up' : '😴 Just Starting'}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Calories', val: `${todayData.totalCalories}/${calorieGoal}`, ok: todayData.totalCalories >= calorieGoal * 0.7 },
                { label: 'Hydration', val: `${(todayData.totalWaterMl/1000).toFixed(1)}/${waterGoal/1000}L`, ok: todayData.totalWaterMl >= waterGoal * 0.7 },
                { label: 'Protein', val: `${Math.round(todayData.totalProtein)}/${proteinGoal}g`, ok: todayData.totalProtein >= proteinGoal * 0.7 },
              ].map(({ label, val, ok }) => (
                <div key={label} className={`glass-card px-3 py-2 border ${ok ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/5'}`}>
                  <div className="text-[10px] text-white/30 uppercase tracking-widest">{label}</div>
                  <div className={`text-sm font-bold ${ok ? 'text-emerald-400' : 'text-white/60'}`}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Metric Rings Grid */}
      <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
        {metrics.map((m, i) => {
          const pct = Math.min(m.value / m.goal, 1);
          const R = 30;
          const circ = 2 * Math.PI * R;
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
              className="glass-card p-4 flex flex-col items-center gap-2 text-center hover:border-white/10 transition-colors"
            >
              <div className="relative w-16 h-16">
                <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
                  <circle cx="36" cy="36" r={R} fill="none"
                    stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
                  <motion.circle cx="36" cy="36" r={R} fill="none"
                    stroke={m.color} strokeWidth="7" strokeLinecap="round"
                    strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: circ * (1 - pct) }}
                    transition={{ duration: 1.2, delay: i * 0.06, ease: 'circOut' }}
                    style={{ filter: `drop-shadow(0 0 6px ${m.glow})` }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icon size={16} style={{ color: m.color }} />
                </div>
              </div>
              <div>
                <div className="text-base font-black text-white">
                  {typeof m.value === 'number' ? m.value.toLocaleString() : m.value}
                  <span className="text-[10px] text-white/30 ml-0.5">{m.unit}</span>
                </div>
                <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold">{m.label}</div>
                <div className="text-[9px] text-white/20 mt-0.5">
                  {Math.round(pct * 100)}% of {m.goal.toLocaleString()}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Grid: Insights & Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: AI Bio-Insights */}
        <div className="glass-card p-6 flex flex-col">
          <div className="text-xs text-white/30 uppercase tracking-widest font-bold mb-5 flex items-center gap-2">
            <span>✨ AI Bio-Insights & Alerts</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <div className="space-y-4 flex-1">
            {(() => {
              const insights = [];
              if (todayData.totalWaterMl < waterGoal * 0.5) {
                insights.push({
                  type: 'warning',
                  text: 'Dehydration Risk: Hydration is below 50% of your daily goal. Keep sipping!',
                  icon: '💧',
                  color: 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5',
                });
              } else if (todayData.totalWaterMl >= waterGoal) {
                insights.push({
                  type: 'success',
                  text: 'Optimal Hydration: Daily water goal achieved. Stellar job!',
                  icon: '🌊',
                  color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
                });
              }

              const sleepHours = todayData.sleepEntry ? todayData.sleepEntry.totalMinutes / 60 : 0;
              if (todayData.sleepEntry) {
                if (sleepHours < 7) {
                  insights.push({
                    type: 'warning',
                    text: `Sleep Deficit: Logged only ${sleepHours.toFixed(1)}h. Aim for at least 7-8h for maximum cognitive restoration.`,
                    icon: '🌙',
                    color: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5',
                  });
                } else {
                  insights.push({
                    type: 'success',
                    text: 'Rejuvenated Mind: Solid sleep duration logged. Perfect for deep focus sessions today.',
                    icon: '🧠',
                    color: 'text-purple-400 border-purple-500/20 bg-purple-500/5',
                  });
                }
              }

              if (todayData.totalProtein >= proteinGoal) {
                insights.push({
                  type: 'success',
                  text: 'Anabolic Surge: Protein target achieved! Muscle recovery and growth fully optimized.',
                  icon: '⚡',
                  color: 'text-violet-400 border-violet-500/20 bg-violet-500/5',
                });
              }

              if (todayData.workouts.length > 0) {
                insights.push({
                  type: 'success',
                  text: `Endorphin High: Completed ${todayData.workouts.length} workout session(s) totaling ${todayData.totalWorkoutMinutes} mins.`,
                  icon: '💪',
                  color: 'text-orange-400 border-orange-500/20 bg-orange-500/5',
                });
              }

              if (insights.length === 0) {
                insights.push({
                  type: 'info',
                  text: 'Awaiting Metrics: Log meals, water, and workouts to unlock real-time cognitive & physical performance insights.',
                  icon: '✨',
                  color: 'text-white/40 border-white/5 bg-white/[0.01]',
                });
              }

              return insights.map((insight, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className={`border rounded-2xl p-4 flex gap-3 items-start ${insight.color}`}
                >
                  <span className="text-xl flex-shrink-0">{insight.icon}</span>
                  <div className="text-xs font-semibold leading-relaxed">{insight.text}</div>
                </motion.div>
              ));
            })()}
          </div>
        </div>

        {/* Right Column: Today's Health Timeline */}
        <div className="glass-card p-6">
          <div className="text-xs text-white/30 uppercase tracking-widest font-bold mb-5">
            Today's Health Timeline
          </div>
          {timelineItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="text-4xl mb-3">🌅</div>
              <div className="text-white/50 font-medium">Start logging your health data.</div>
              <div className="text-white/20 text-sm mt-1">Your day's timeline will appear here.</div>
            </div>
          ) : (
            <div className="relative space-y-4">
              <div className="absolute left-[52px] top-0 bottom-0 w-px bg-white/5" />
              {timelineItems.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-4"
                >
                  <div className="w-12 text-right text-[10px] text-white/30 font-mono flex-shrink-0 mt-0.5">
                    {item.time}
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 text-xs"
                    style={{ borderColor: item.color, background: `${item.color}20` }}>
                    {item.emoji}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{item.label}</div>
                    <div className="text-xs text-white/40">{item.sub}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
