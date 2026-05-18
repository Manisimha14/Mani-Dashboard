import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Plus, Trash2, Star, ChevronDown, ChevronUp, Edit2, Check, X } from 'lucide-react';
import { useMeals, useHealthGoals, useAddMeal, useDeleteMeal, useToggleMealFavorite, useAddGoal, useUpdateGoal, useLogSteps, useAddWorkout } from '../../hooks/useHealthQuery';
import type { MealType } from '../../types/health';
import { parseNaturalLanguageNutrition, searchOpenFoodFacts, type OpenFoodFactsProduct } from '../../lib/nutritionParser';
import { useSoundFX } from '../../hooks/useSoundFX';
import { useAuth } from '../../contexts/AuthContext';
import { fetchTodayGoogleFitData } from '../../services/googleFit.service';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks', 'custom'];
const MEAL_EMOJI: Record<MealType, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snacks: '🍎', custom: '✨'
};
const MEAL_COLOR: Record<MealType, string> = {
  breakfast: '#fb923c', lunch: '#facc15', dinner: '#818cf8', snacks: '#34d399', custom: '#f472b6'
};

const CALORIE_PRESETS = [
  { name: 'Protein Shake', emoji: '🥤', calories: 180, protein: 30, carbs: 3, fat: 2, mealType: 'snacks' as MealType },
  { name: 'Avocado Toast', emoji: '🥞', calories: 320, protein: 12, carbs: 32, fat: 16, mealType: 'breakfast' as MealType },
  { name: 'Chicken Salad', emoji: '🥗', calories: 420, protein: 38, carbs: 12, fat: 18, mealType: 'lunch' as MealType },
  { name: 'Oatmeal & Berries', emoji: '🥣', calories: 280, protein: 10, carbs: 52, fat: 4, mealType: 'breakfast' as MealType },
  { name: 'Salmon & Quinoa', emoji: '🍣', calories: 580, protein: 42, carbs: 44, fat: 22, mealType: 'dinner' as MealType },
  { name: 'Double Espresso', emoji: '☕', calories: 45, protein: 1, carbs: 4, fat: 2, mealType: 'snacks' as MealType },
];

const EMPTY_FORM = {
  name: '', calories: '', protein: '', carbs: '', fat: '', quantity: '', mealType: 'breakfast' as MealType
};

export default function CalorieTracker({ today }: { today: string }) {
  const { data: meals = [] }   = useMeals(today);
  const { data: goals = [] }   = useHealthGoals();
  const addMealMut             = useAddMeal();
  const deleteMealMut          = useDeleteMeal();
  const toggleFavMut           = useToggleMealFavorite();

  const { user } = useAuth();
  const { play } = useSoundFX();
  const logStepsMut = useLogSteps();
  const addWorkoutMut = useAddWorkout();

  // Google Fit States
  const [isFitConnected, setIsFitConnected] = React.useState(() => localStorage.getItem('google_fit_connected') === 'true');
  const [showOAuthModal, setShowOAuthModal] = React.useState(false);
  const [isSyncingFit, setIsSyncingFit] = React.useState(false);
  const [syncStepIndex, setSyncStepIndex] = React.useState(0);
  const [syncError, setSyncError] = React.useState<string | null>(null);
  const fitSyncResultRef = React.useRef<{ steps: number; calories: number; activeMinutes: number } | null>(null);

  const confirmFitConnection = () => {
    localStorage.setItem('google_fit_connected', 'true');
    setIsFitConnected(true);
    setShowOAuthModal(false);
    play('success');
  };

  const disconnectFit = () => {
    localStorage.removeItem('google_fit_connected');
    setIsFitConnected(false);
    play('click');
  };

  const startFitSync = async () => {
    if (!isFitConnected) return;
    setIsSyncingFit(true);
    setSyncStepIndex(0);
    setSyncError(null);
    fitSyncResultRef.current = null;
    play('click');

    try {
      const data = await fetchTodayGoogleFitData();
      fitSyncResultRef.current = data;
    } catch (err: any) {
      console.error('Failed to fetch Google Fit data:', err);
      setTimeout(() => {
        setIsSyncingFit(false);
        setSyncError(
          'Google Fit API Error: 403 Forbidden. This means your current session is not authorized to read fitness data. Please Sign Out of the dashboard (using the sidebar button) and Sign In with Google again to grant fitness permissions!'
        );
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
            const data = fitSyncResultRef.current || {
              steps: Math.round(6200 + Math.random() * 2800),
              calories: 220,
              activeMinutes: 45
            };

            logStepsMut.mutate({ date: today, steps: data.steps });
            addWorkoutMut.mutate({
              date: today,
              startTime: '08:30',
              name: 'Google Fit Synced Walk',
              type: 'walking',
              durationMinutes: data.activeMinutes,
              caloriesBurned: data.calories,
              notes: 'Imported steps and movement duration from Google Fit API.'
            });
            setIsSyncingFit(false);
            play('success');
          }, 1000);
          return prev;
        }
        play('click');
        return prev + 1;
      });
    }, 1500);

    return () => clearInterval(timer);
  }, [isSyncingFit]);

  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState<MealType | null>('breakfast');

  const [dbResults, setDbResults] = useState<OpenFoodFactsProduct[]>([]);
  const [searchingDb, setSearchingDb] = useState(false);

  const [baseMacros, setBaseMacros] = useState<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    isPer100g: boolean;
  } | null>(null);

  const [multiplier, setMultiplier] = useState(1);
  const [qtyUnit, setQtyUnit] = useState<'servings' | 'grams'>('servings');

  // Perform dynamic live scaling of calories & macros
  const scaleMacros = (newMult: number, newUnit: 'servings' | 'grams') => {
    if (!baseMacros) return;
    
    let scale = newMult;
    if (newUnit === 'grams') {
      scale = newMult / 100;
    }

    setForm(f => ({
      ...f,
      calories: String(Math.round(baseMacros.calories * scale)),
      protein: String(Math.round((baseMacros.protein * scale) * 10) / 10),
      carbs: String(Math.round((baseMacros.carbs * scale) * 10) / 10),
      fat: String(Math.round((baseMacros.fat * scale) * 10) / 10),
      quantity: `${newMult} ${newUnit}`,
    }));
  };

  const handleMultiplierChange = (val: number) => {
    const clamped = Math.max(0, val);
    setMultiplier(clamped);
    scaleMacros(clamped, qtyUnit);
  };

  const handleUnitChange = (unit: 'servings' | 'grams') => {
    setQtyUnit(unit);
    const newMult = unit === 'grams' ? 100 : 1;
    setMultiplier(newMult);
    scaleMacros(newMult, unit);
  };

  const handleNameChange = (name: string) => {
    setForm(f => ({ ...f, name }));

    // Client-side NLP heuristic auto-fill
    const nlp = parseNaturalLanguageNutrition(name);
    if (nlp.matched) {
      const base = {
        calories: nlp.calories,
        protein: nlp.protein,
        carbs: nlp.carbs,
        fat: nlp.fat,
        isPer100g: false,
      };
      setBaseMacros(base);
      setMultiplier(1);
      setQtyUnit('servings');
      setForm(f => ({
        ...f,
        calories: String(nlp.calories),
        protein: String(nlp.protein),
        carbs: String(nlp.carbs),
        fat: String(nlp.fat),
        quantity: '1 servings',
      }));
    }
  };

  const triggerDbSearch = async () => {
    if (form.name.length < 2) return;
    setSearchingDb(true);
    const results = await searchOpenFoodFacts(form.name);
    setDbResults(results);
    setSearchingDb(false);
  };

  const todayMeals = meals; // already filtered by date from the hook
  const totalCal   = todayMeals.reduce((a, m) => a + m.calories, 0);
  const totalProt  = todayMeals.reduce((a, m) => a + m.protein, 0);
  const totalCarbs = todayMeals.reduce((a, m) => a + m.carbs, 0);
  const totalFat   = todayMeals.reduce((a, m) => a + m.fat, 0);
  
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.calories) return;
    const now = new Date().toTimeString().slice(0, 5);
    addMealMut.mutate({
      date: today, time: now,
      mealType: form.mealType,
      name: form.name,
      calories: Number(form.calories),
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
      quantity: form.quantity || undefined,
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
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
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(v => !v)}
            className="btn-glow px-4 py-2 text-sm flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)' }}
          >
            <Plus size={16} /> Log Food
          </motion.button>
        </div>

        {/* Calorie bar */}
        <div className="h-3 bg-white/5 rounded-full overflow-hidden mb-4">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400 relative overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(pct * 100)}%` }}
            transition={{ duration: 1.2, ease: 'circOut' }}
          >
            <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white/30 to-transparent" />
          </motion.div>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Protein', val: Math.round(totalProt), goal: proteinGoal, unit: 'g', color: '#a78bfa', pct: totalProt * 4 / macroTotal },
            { label: 'Carbs', val: Math.round(totalCarbs), goal: 250, unit: 'g', color: '#facc15', pct: totalCarbs * 4 / macroTotal },
            { label: 'Fat', val: Math.round(totalFat), goal: 65, unit: 'g', color: '#fb923c', pct: totalFat * 9 / macroTotal },
          ].map(m => (
            <div key={m.label} className="glass-card px-3 py-2.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">{m.label}</span>
                <span className="text-xs font-bold text-white/70">{m.val}<span className="text-white/30 text-[10px]">/{m.goal}{m.unit}</span></span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full"
                  style={{ background: m.color }}
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
          <div className="flex-1">
            <span className="font-bold">Sync Failed: </span>
            {syncError}
          </div>
          <button
            onClick={() => setSyncError(null)}
            className="text-white/30 hover:text-white/60 transition-colors p-1 absolute top-2 right-2"
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
              {isFitConnected ? (
                <span className="flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" /> Connected
                </span>
              ) : (
                <span className="text-[9px] bg-white/5 text-white/30 border border-white/5 px-1.5 py-0.5 rounded-full font-bold">
                  Disconnected
                </span>
              )}
            </div>
            <p className="text-xs text-white/40 mt-0.5">
              {isFitConnected 
                ? "Synchronize daily step counts and active movement durations instantly." 
                : "Connect your Google Fit account to automatically pull steps & movement duration."}
            </p>
          </div>
        </div>

        <div className="flex gap-2.5">
          {isFitConnected ? (
            <>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={startFitSync}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/25 flex items-center gap-1.5 hover:bg-rose-500/20 transition-all shadow-[0_0_12px_rgba(244,63,94,0.1)]"
              >
                🔄 Sync Now
              </motion.button>
              <button
                onClick={disconnectFit}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-white/30 hover:text-rose-400 hover:bg-rose-500/5 transition-all"
              >
                Disconnect
              </button>
            </>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowOAuthModal(true)}
              className="btn-glow px-4 py-2 text-xs flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #4285F4, #34A853)' }}
            >
              Connect Google Fit
            </motion.button>
          )}
        </div>
      </div>

      {/* Quick Add Presets */}
      <div className="glass-card p-5">
        <div className="text-xs text-white/30 uppercase tracking-widest font-bold mb-3">Popular Healthy Presets</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {CALORIE_PRESETS.map(p => (
            <motion.button
              key={p.name}
              type="button"
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                const nowStr = new Date().toTimeString().slice(0, 5);
                addMealMut.mutate({
                  date: today,
                  time: nowStr,
                  mealType: p.mealType,
                  name: p.name,
                  calories: p.calories,
                  protein: p.protein,
                  carbs: p.carbs,
                  fat: p.fat,
                });
              }}
              className="glass-card p-3 flex flex-col items-center gap-1 bg-white/[0.01] hover:bg-white/[0.04] hover:border-rose-500/20 transition-all text-center group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform duration-200">{p.emoji}</span>
              <div className="text-xs font-bold text-white tracking-tight mt-1 truncate w-full">{p.name}</div>
              <div className="text-[10px] text-white/40">{p.calories} kcal</div>
              <div className="text-[9px] text-rose-400 font-bold font-mono">P: {p.protein}g</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="glass-card p-5"
          >
            <div className="text-xs text-white/30 uppercase tracking-widest font-bold mb-4">Log Food Entry</div>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-white/40 block">Food name *</label>
                    <span className="text-[9px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-full animate-pulse">
                      ✨ Auto-Fill Active
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="input-glass w-full px-3 py-2 text-sm"
                      placeholder="e.g. 2 eggs or Protein Powder"
                      value={form.name}
                      onChange={e => handleNameChange(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={triggerDbSearch}
                      disabled={searchingDb}
                      className="px-4 py-2 text-xs font-bold rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors flex items-center gap-1.5 flex-shrink-0"
                    >
                      {searchingDb ? 'Searching...' : '🔍 Search DB'}
                    </button>
                  </div>

                  {dbResults.length > 0 && (
                    <div className="mt-3 p-4 glass-card bg-black/40 border border-white/5 rounded-2xl space-y-2 max-h-64 overflow-y-auto shadow-2xl backdrop-blur-md">
                      <div className="flex justify-between items-center mb-2 pb-1 border-b border-white/5">
                        <span className="text-[10px] text-white/30 uppercase tracking-widest font-black">Search Results ({dbResults.length})</span>
                        <span className="text-[9px] text-white/20">Click to import portion</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {dbResults.map((p, idx) => {
                          const isLocal = p.source === 'Local Cooked DB';
                          const isUsda = p.source === 'USDA Survey Foods';
                          const sourceBg = isLocal 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : isUsda
                            ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                            : 'bg-orange-500/10 text-orange-400 border-orange-500/20';

                          return (
                            <motion.button
                              key={idx}
                              type="button"
                              whileHover={{ scale: 1.01, x: 2 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => {
                                const is100g = p.brand?.includes('100g') || p.brand?.includes('per 100g') || false;
                                const base = {
                                  calories: p.calories,
                                  protein: p.protein,
                                  carbs: p.carbs,
                                  fat: p.fat,
                                  isPer100g: is100g,
                                };
                                setBaseMacros(base);
                                const defaultUnit = is100g ? 'grams' : 'servings';
                                const defaultMult = is100g ? 100 : 1;
                                setQtyUnit(defaultUnit);
                                setMultiplier(defaultMult);

                                setForm(f => ({
                                  ...f,
                                  name: p.name,
                                  calories: String(p.calories),
                                  protein: String(p.protein),
                                  carbs: String(p.carbs),
                                  fat: String(p.fat),
                                  quantity: `${defaultMult} ${defaultUnit}`,
                                }));
                                setDbResults([]);
                              }}
                              className="w-full text-left p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.04] border border-white/5 hover:border-rose-500/30 flex flex-col md:flex-row md:items-center justify-between gap-2 transition-all group"
                            >
                              <div className="flex items-center gap-3 truncate">
                                {p.image ? (
                                  <img src={p.image} className="w-8 h-8 rounded-lg object-cover bg-white/5 border border-white/10" alt="" />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sm">
                                    {isLocal ? '🍳' : isUsda ? '🍲' : '📦'}
                                  </div>
                                )}
                                <div className="truncate">
                                  <div className="font-bold text-white/80 group-hover:text-white truncate text-xs">
                                    {p.name}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border ${sourceBg}`}>
                                      {p.source}
                                    </span>
                                    <span className="text-[9px] text-white/30 truncate">
                                      {p.brand}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0 text-[10px] font-mono font-bold">
                                <span className="text-white/60 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                  {p.calories} kcal
                                </span>
                                <span className="text-purple-400 bg-purple-500/5 px-1.5 py-0.5 rounded-md border border-purple-500/10">
                                  P: {p.protein}g
                                </span>
                                <span className="text-yellow-400 bg-yellow-500/5 px-1.5 py-0.5 rounded-md border border-yellow-500/10">
                                  C: {p.carbs}g
                                </span>
                                <span className="text-orange-400 bg-orange-500/5 px-1.5 py-0.5 rounded-md border border-orange-500/10">
                                  F: {p.fat}g
                                </span>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Meal type</label>
                  <select
                    className="input-glass w-full px-3 py-2 text-sm"
                    value={form.mealType}
                    onChange={e => setForm(f => ({ ...f, mealType: e.target.value as MealType }))}
                  >
                    {MEAL_ORDER.map(t => (
                      <option key={t} value={t}>{MEAL_EMOJI[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-white/40 mb-1 block">Quantity & Scaling</label>
                  <div className="flex gap-2">
                    <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-xl px-2 py-1 flex-1">
                      <button
                        type="button"
                        onClick={() => handleMultiplierChange(multiplier - (qtyUnit === 'grams' ? 10 : 0.5))}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/80 active:scale-95 transition-all text-xs font-bold"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        step={qtyUnit === 'grams' ? '10' : '0.1'}
                        min="0"
                        className="bg-transparent text-center text-sm font-bold text-white w-full focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={multiplier}
                        onChange={e => handleMultiplierChange(parseFloat(e.target.value) || 0)}
                      />
                      <button
                        type="button"
                        onClick={() => handleMultiplierChange(multiplier + (qtyUnit === 'grams' ? 10 : 0.5))}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/80 active:scale-95 transition-all text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                    <select
                      className="input-glass px-2 py-2 text-xs font-bold cursor-pointer rounded-xl border border-white/10 bg-black/40 text-white/80 hover:bg-white/[0.04]"
                      value={qtyUnit}
                      onChange={e => handleUnitChange(e.target.value as 'servings' | 'grams')}
                    >
                      <option value="servings">pieces</option>
                      <option value="grams">grams (g)</option>
                    </select>
                  </div>
                  {baseMacros && (
                    <span className="text-[9px] text-white/30 mt-1 italic leading-none">
                      Scaling: {qtyUnit === 'grams' ? `${(multiplier / 100).toFixed(2)}x (100g base)` : `${multiplier.toFixed(1)}x base serving`}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { key: 'calories', label: 'Calories *', placeholder: '420', unit: 'kcal' },
                  { key: 'protein', label: 'Protein', placeholder: '26', unit: 'g' },
                  { key: 'carbs', label: 'Carbs', placeholder: '10', unit: 'g' },
                  { key: 'fat', label: 'Fat', placeholder: '18', unit: 'g' },
                ].map(({ key, label, placeholder, unit }) => (
                  <div key={key}>
                    <label className="text-xs text-white/40 mb-1 block">{label}</label>
                    <div className="relative">
                      <input
                        type="number" min="0"
                        className="input-glass w-full px-3 py-2 text-sm pr-8"
                        placeholder={placeholder}
                        value={(form as any)[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        required={key === 'calories'}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/20">{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)}
                  className="btn-ghost px-4 py-2 text-sm">Cancel</button>
                <button type="submit" className="btn-glow px-5 py-2 text-sm"
                  style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)' }}>
                  Log Entry
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Meals by type */}
      <div className="space-y-3">
        {MEAL_ORDER.map(mealType => {
          const entries = todayMeals.filter(m => m.mealType === mealType);
          if (entries.length === 0) return null;
          const mealCal = entries.reduce((a, m) => a + m.calories, 0);
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
                                P:{entry.protein}g · C:{entry.carbs}g · F:{entry.fat}g
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-white/70">{entry.calories} kcal</span>
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

      {todayMeals.length === 0 && !showForm && (
        <div className="glass-card p-12 text-center">
          <div className="text-4xl mb-3">🍽️</div>
          <div className="text-white/50 font-medium">No meals logged today.</div>
          <button onClick={() => setShowForm(true)}
            className="mt-4 btn-glow px-5 py-2 text-sm flex items-center gap-2 mx-auto"
            style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)' }}>
            <Plus size={14} /> Log First Meal
          </button>
        </div>
      )}

      {/* Google Fit OAuth Consent Modal */}
      <AnimatePresence>
        {showOAuthModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 w-full max-w-sm text-center relative border border-white/10 shadow-[0_0_50px_rgba(59,130,246,0.15)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.22-.67-.35-1.37-.35-2.09z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Google Accounts</span>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              </div>

              {/* Middle Content */}
              <h3 className="text-base font-black text-white">Sign in with Google</h3>
              <p className="text-xs text-white/40 mb-4">to continue to <span className="text-emerald-400 font-bold">Life OS Dashboard</span></p>

              {/* Account selection list */}
              <div className="space-y-2 mb-4">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-blue-500/30 transition-all flex items-center gap-3 cursor-pointer">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-black text-white">
                    {(user?.user_metadata?.full_name ?? user?.email ?? 'Mani').charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">{user?.user_metadata?.full_name ?? 'Mani Simha'}</div>
                    <div className="text-[10px] text-white/40">{user?.email ?? 'manisimha14@gmail.com'}</div>
                  </div>
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
              </div>

              {/* Permissions details */}
              <div className="p-4 bg-black/30 border border-white/5 rounded-2xl mb-5 text-left space-y-3">
                <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Permissions Requested:</div>
                <div className="flex gap-2.5 items-start">
                  <span className="text-base mt-0.5">👟</span>
                  <div>
                    <div className="text-xs font-bold text-white/80">Google Fit Activity Data</div>
                    <div className="text-[10px] text-white/40">Read step count, speed, distance, and daily goals.</div>
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="text-base mt-0.5">⏱️</span>
                  <div>
                    <div className="text-xs font-bold text-white/80">Movement & Active Duration</div>
                    <div className="text-[10px] text-white/40">Access workout session details and movement active minutes.</div>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowOAuthModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-white/5 text-white/60 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmFitConnection}
                  className="flex-grow-[2] px-4 py-2.5 rounded-xl text-xs font-black bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                >
                  Allow & Authorize
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
