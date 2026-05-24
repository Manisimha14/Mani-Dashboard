import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Droplets, Flame, Dumbbell, Moon, Target,
  TrendingUp, Plus, Activity, Zap, Footprints, Sparkles
} from 'lucide-react';
import { todayString } from '../lib/utils';
import { useTodayHealthData, useHealthGoals } from '../hooks/useHealthQuery';
import HealthOverview from '../components/health/HealthOverview';
import { HealthSkeleton } from '../components/Skeletons';
import CalorieTracker from '../components/health/CalorieTracker';
import WaterTracker from '../components/health/WaterTracker';
import StepsTracker from '../components/health/StepsTracker';
import WorkoutTracker from '../components/health/WorkoutTracker';
import SleepTracker from '../components/health/SleepTracker';
import GoalsPanel from '../components/health/GoalsPanel';
import { FoodLogger } from '../components/food-logger/FoodLogger';

const TABS = [
  { id: 'overview',  label: 'Overview',  icon: Activity },
  { id: 'calories',  label: 'Calories',  icon: Flame },
  { id: 'water',     label: 'Hydration', icon: Droplets },
  { id: 'steps',     label: 'Steps',     icon: Footprints },
  { id: 'workout',   label: 'Workout',   icon: Dumbbell },
  { id: 'sleep',     label: 'Sleep',     icon: Moon },
  { id: 'food_log',  label: 'AI Food Log', icon: Sparkles },
  { id: 'goals',     label: 'Goals',     icon: Target },
] as const;

type Tab = typeof TABS[number]['id'];

export default function Health() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const todayData = useTodayHealthData();
  const { data: goals = [], isLoading: isLoadingGoals } = useHealthGoals();
  
  const isLoading = todayData.isLoading || isLoadingGoals;

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <HealthSkeleton />
      </motion.div>
    );
  }

  const today = todayString();

  const calorieGoal = goals.find(g => g.type === 'calories')?.targetValue ?? 1700;
  const waterGoal   = goals.find(g => g.type === 'water')?.targetValue   ?? 3000;
  const stepsGoal   = goals.find(g => g.type === 'steps')?.targetValue   ?? 10000;
  
  const calPct   = Math.min(todayData.totalCalories / calorieGoal, 1);
  const waterPct = Math.min(todayData.totalWaterMl / waterGoal, 1);
  const stepsPct = Math.min(todayData.steps / stepsGoal, 1);

  return (
    <div className="page-enter space-y-6">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600
                          flex items-center justify-center shrink-0 shadow-[0_0_24px_rgba(244,63,94,0.4)]">
            <Heart size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Health Hub</h1>
            <p className="text-xs text-white/40 font-medium uppercase tracking-widest mt-0.5">
              Life OS · Personal Performance
            </p>
          </div>
        </div>

        {/* Quick KPIs - Scrollable on mobile, no layout breakage */}
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar py-1 shrink-0">
          <QuickKpi label="Calories" value={`${todayData.totalCalories}`} unit="kcal"
            pct={calPct} color="rose" icon="🔥" />
          <QuickKpi label="Water" value={`${(todayData.totalWaterMl / 1000).toFixed(1)}`} unit="L"
            pct={waterPct} color="cyan" icon="💧" />
          <QuickKpi label="Steps" value={`${todayData.steps.toLocaleString()}`} unit="steps"
            pct={stepsPct} color="emerald" icon="👟" />
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────── */}
      <div className="flex gap-1 p-1 glass-card rounded-2xl w-full md:w-fit overflow-x-auto no-scrollbar scroll-smooth shrink-0">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                          transition-colors duration-200 shrink-0
                          ${active
                            ? 'text-white'
                            : 'text-white/40 hover:text-white/70'}`}
            >
              {active && (
                <motion.div
                  layoutId="health-tab"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-rose-500/80 to-pink-600/80
                             shadow-[0_0_16px_rgba(244,63,94,0.35)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10"><Icon size={14} /></span>
              <span className="relative z-10">{tab.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* ── Content ───────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview'  && (
            <HealthOverview
              todayData={todayData}
              goals={goals}
              today={today}
              onTabChange={(t) => setActiveTab(t as Tab)}
            />
          )}
          {activeTab === 'calories'  && <CalorieTracker today={today} />}
          {activeTab === 'water'     && <WaterTracker today={today} />}
          {activeTab === 'steps'     && <StepsTracker today={today} />}
          {activeTab === 'workout'   && <WorkoutTracker today={today} />}
          { activeTab === 'sleep'     && <SleepTracker today={today} /> }
          { activeTab === 'food_log'  && <FoodLogger /> }
          { activeTab === 'goals'     && <GoalsPanel /> }
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Quick KPI chip ──────────────────────────────────────────────────────────
const QuickKpi = React.memo(function QuickKpi({ label, value, unit, pct, color, icon }: {
  label: string; value: string; unit: string; pct: number;
  color: 'rose' | 'cyan' | 'violet' | 'emerald'; icon: string;
}) {
  const colors = {
    rose:   'from-rose-500/20 to-pink-600/10 border-rose-500/20',
    cyan:   'from-cyan-500/20 to-sky-600/10 border-cyan-500/20',
    violet: 'from-violet-500/20 to-purple-600/10 border-violet-500/20',
    emerald: 'from-emerald-500/20 to-teal-600/10 border-emerald-500/20',
  };
  const fills = {
    rose:   'from-rose-500 to-pink-500',
    cyan:   'from-cyan-400 to-sky-500',
    violet: 'from-violet-500 to-purple-500',
    emerald: 'from-emerald-400 to-teal-500',
  };
  return (
    <div className={`glass-card bg-gradient-to-br ${colors[color]} border px-4 py-2.5 min-w-[90px]`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-black text-white">{value}</span>
        <span className="text-[10px] text-white/40">{unit}</span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${fills[color]}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(pct * 100)}%` }}
          transition={{ duration: 1, ease: 'circOut' }}
        />
      </div>
    </div>
  );
});
