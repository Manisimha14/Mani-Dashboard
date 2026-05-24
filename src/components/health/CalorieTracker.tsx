import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Plus, Trash2, Star, ChevronDown, ChevronUp, Edit2, Check, X } from 'lucide-react';
import { useMeals, useHealthGoals, useAddMeal, useDeleteMeal, useToggleMealFavorite, useAddGoal, useUpdateGoal, useLogSteps, useAddWorkout, useWorkouts, useDeleteWorkout } from '../../hooks/useHealthQuery';
import type { MealType } from '../../types/health';
import { useSoundFX } from '../../hooks/useSoundFX';
import { useAuth } from '../../contexts/AuthContext';
import { fetchTodayGoogleFitData, getGoogleFitSyncFeedback, type GoogleFitSyncFeedback } from '../../services/googleFit.service';
import { FoodLogger } from '../food-logger/FoodLogger';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks', 'custom'];
const MEAL_EMOJI: Record<MealType, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snacks: '🍎', custom: '✨'
};
const MEAL_COLOR: Record<MealType, string> = {
  breakfast: '#fb923c', lunch: '#facc15', dinner: '#818cf8', snacks: '#34d399', custom: '#f472b6'
};

export default function CalorieTracker({ today }: { today: string }) {
  const { data: meals = [] }   = useMeals(today);
  const { data: goals = [] }   = useHealthGoals();
  const addMealMut             = useAddMeal();
  const deleteMealMut          = useDeleteMeal();
  const toggleFavMut           = useToggleMealFavorite();

  const { user, signInWithGoogle } = useAuth();
  const { play } = useSoundFX();
  const logStepsMut = useLogSteps();
  const addWorkoutMut = useAddWorkout();
  const deleteWorkoutMut = useDeleteWorkout();
  const { data: workouts = [] } = useWorkouts(today);

  const [isSyncingFit, setIsSyncingFit] = React.useState(false);
  const [syncStepIndex, setSyncStepIndex] = React.useState(0);
  const [syncError, setSyncError] = React.useState<GoogleFitSyncFeedback | null>(null);
  const [showTroubleshoot, setShowTroubleshoot] = React.useState(false);

  // Unified sync workout name for reliable deduplication across all sync types
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
      const data = await fetchTodayGoogleFitData();
      logStepsMut.mutate({ date: today, steps: data.steps });

      const existingSync = workouts.find(w =>
        w.name === SYNC_WORKOUT_NAME ||
        w.name === 'Google Fit Synced Walk' ||
        w.name === 'Google Fit Synced Walk (Simulated)'
      );
      if (existingSync) {
        deleteWorkoutMut.mutate(existingSync.id);
      }

      addWorkoutMut.mutate({
        date: today,
        startTime: '08:30',
        name: SYNC_WORKOUT_NAME,
        type: 'walking',
        durationMinutes: data.activeMinutes,
        caloriesBurned: data.calories,
        notes: `Synced from Google Fit — ${data.steps.toLocaleString()} steps, ${data.activeMinutes} active minutes.`
      });
    } catch (err: any) {
      console.error('Failed to fetch Google Fit data:', err);
      setTimeout(() => {
        setIsSyncingFit(false);
        setSyncError(getGoogleFitSyncFeedback(err));
        play('click');
      }, 1200);
    }
  };

  // Sync step sequencer animation
  React.useEffect(() => {
    if (!isSyncingFit) return;
    const timer = setInterval(() => {
      setSyncStepIndex(prev => {
        if (prev >= 3) {
          clearInterval(timer);
          
          setTimeout(() => {
            setIsSyncingFit(false);
            play('success');
          }, 300);
          return prev;
        }
        play('click');
        return prev + 1;
      });
    }, 250); // High performance, snappy 250ms transition intervals

    return () => clearInterval(timer);
  }, [isSyncingFit]);

  const [expandedMeal, setExpandedMeal] = useState<MealType | null>('breakfast');

  const formatDecimal = (num: number) => Number((num || 0).toFixed(1));

  const todayMeals = meals; // already filtered by date from the hook
  const totalCal   = formatDecimal(todayMeals.reduce((a, m) => a + m.calories, 0));
  const totalProt  = formatDecimal(todayMeals.reduce((a, m) => a + m.protein, 0));
  const totalCarbs = formatDecimal(todayMeals.reduce((a, m) => a + m.carbs, 0));
  const totalFat   = formatDecimal(todayMeals.reduce((a, m) => a + m.fat, 0));
  
  const addGoalMut = useAddGoal();
  const updateGoalMut = useUpdateGoal();
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoalVal, setTempGoalVal] = useState('');

  const calorieGoal = goals.find(g => g.type === 'calories')?.targetValue ?? 1700;
  const proteinGoal = goals.find(g => g.type === 'protein')?.targetValue ?? 120;
  const pct = Math.min(totalCal / calorieGoal, 1);

  const saveGoal = () => {
    const val = Number(tempGoalVal);
    if (!val || val <= 0) return;
    const existing = goals.find(g => g.type === 'calories');
    if (existing) {
      updateGoalMut.mutate({ id: existing.id, updates: { targetValue: val } });
    } else {
      addGoalMut.mutate({ label: 'Daily Calories', type: 'calories', targetValue: val, unit: 'kcal' });
    }
    setIsEditingGoal(false);
  };

  // Macro percentages for pie-like bars
  const macroTotal = totalProt * 4 + totalCarbs * 4 + totalFat * 9 || 1;

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-white/30 uppercase tracking-widest font-bold">Calories Today</div>
            {isEditingGoal ? (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-2xl font-black text-white">{totalCal.toLocaleString()}</span>
                <span className="text-white/30 text-sm">/</span>
                <input
                  type="number"
                  value={tempGoalVal}
                  onChange={e => setTempGoalVal(e.target.value)}
                  className="input-glass px-2 py-1 text-xs w-20 font-bold"
                  placeholder={String(calorieGoal)}
                  autoFocus
                />
                <button onClick={saveGoal} className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/20">
                  <Check size={11} />
                </button>
                <button onClick={() => setIsEditingGoal(false)} className="p-1.5 rounded-lg bg-white/5 text-white/40">
                  <X size={11} />
                </button>
              </div>
            ) : (
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-black text-white">{totalCal.toLocaleString()}</span>
                <span className="text-white/30 text-sm flex items-center gap-1">
                  / {calorieGoal.toLocaleString()} kcal
                  <button
                    onClick={() => { setTempGoalVal(String(calorieGoal)); setIsEditingGoal(true); }}
                    className="text-white/20 hover:text-white/50 transition-colors p-1"
                  >
                    <Edit2 size={12} />
                  </button>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Calorie bar */}
        <div className="h-3 bg-white/5 rounded-full overflow-hidden mb-4 relative shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 relative overflow-hidden shadow-[0_0_12px_rgba(244,63,94,0.6)]"
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(pct * 100)}%` }}
            transition={{ duration: 1.2, ease: 'circOut' }}
          >
            <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white/40 to-transparent" />
          </motion.div>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Protein', val: totalProt, goal: proteinGoal, unit: 'g', color: '#a78bfa', pct: totalProt * 4 / macroTotal },
            { label: 'Carbs', val: totalCarbs, goal: 250, unit: 'g', color: '#facc15', pct: totalCarbs * 4 / macroTotal },
            { label: 'Fat', val: totalFat, goal: 65, unit: 'g', color: '#fb923c', pct: totalFat * 9 / macroTotal },
          ].map(m => (
            <div key={m.label} className="glass-card px-3 py-2.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">{m.label}</span>
                <span className="text-xs font-bold text-white/70">{m.val}<span className="text-white/30 text-[10px]">/{m.goal}{m.unit}</span></span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                <motion.div className="h-full rounded-full"
                  style={{ 
                    background: `linear-gradient(90deg, ${m.color}88, ${m.color})`,
                    boxShadow: `0 0 8px ${m.color}a0`
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(m.val / m.goal, 1) * 100}%` }}
                  transition={{ duration: 1.2, ease: 'circOut' }}
                />
              </div>
            </div>
          ))}
        </div>
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
                className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/30 text-white font-bold transition-all text-[11px] flex items-center gap-1.5 cursor-pointer"
              >
                Retry Sync
              </button>
              {syncError.canReconnect && (
                <button
                  onClick={() => {
                    play('click');
                    signInWithGoogle();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/30 text-white font-bold transition-all text-[11px] flex items-center gap-1.5 cursor-pointer"
                >
                  Reconnect Google
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
      <div className="glass-card p-5 relative overflow-hidden bg-gradient-to-r from-blue-500/5 to-rose-500/5 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-xl">
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
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/25 flex items-center gap-1.5 hover:bg-rose-500/20 transition-all shadow-[0_0_12px_rgba(244,63,94,0.1)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            🔄 Sync from Google Fit
          </motion.button>
        </div>
      </div>

      {/* AI Food Logger Integration */}
      <div className="mb-6">
        <FoodLogger />
      </div>

      {/* Meals by type */}
      <div className="space-y-3">
        {MEAL_ORDER.map(mealType => {
          const entries = todayMeals.filter(m => m.mealType === mealType);
          if (entries.length === 0) return null;
          const mealCal = formatDecimal(entries.reduce((a, m) => a + m.calories, 0));
          const isOpen = expandedMeal === mealType;
          return (
            <div key={mealType} className="glass-card overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4"
                onClick={() => setExpandedMeal(isOpen ? null : mealType)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{MEAL_EMOJI[mealType]}</span>
                  <div className="text-left">
                    <div className="text-sm font-bold text-white capitalize">{mealType}</div>
                    <div className="text-xs text-white/30">{entries.length} item{entries.length !== 1 ? 's' : ''}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black" style={{ color: MEAL_COLOR[mealType] }}>
                    {mealCal} kcal
                  </span>
                  {isOpen ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
                </div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    className="overflow-hidden border-t border-white/5"
                  >
                    <div className="p-4 space-y-2">
                      {entries.map(entry => (
                        <div key={entry.id}
                          className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.02] group">
                          <div className="flex items-center gap-3">
                            <button onClick={() => toggleFavMut.mutate({ id: entry.id, current: entry.isFavorite ?? false })}
                              className={`transition-colors ${entry.isFavorite ? 'text-yellow-400' : 'text-white/15 hover:text-yellow-400'}`}>
                              <Star size={13} fill={entry.isFavorite ? 'currentColor' : 'none'} />
                            </button>
                            <div>
                              <div className="text-sm font-medium text-white">{entry.name}</div>
                              <div className="text-[10px] text-white/30">
                                {entry.quantity && `${entry.quantity} · `}
                                P:{formatDecimal(entry.protein)}g · C:{formatDecimal(entry.carbs)}g · F:{formatDecimal(entry.fat)}g
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-white/70">{formatDecimal(entry.calories)} kcal</span>
                            <button onClick={() => deleteMealMut.mutate(entry.id)}
                              className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-rose-400 transition-all">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {todayMeals.length === 0 && (
        <div className="glass-card p-12 text-center">
          <div className="text-4xl mb-3">🍽️</div>
          <div className="text-white/50 font-medium">No meals logged today.</div>
          <div className="text-white/30 text-xs mt-2">Use the AI Food Logger to track your meals naturally.</div>
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
                  'Authorizing current Google session...',
                  'Pulling today step telemetry...',
                  'Extracting active movement duration...',
                  'Synchronizing verified data...'
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
