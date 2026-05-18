import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  MealEntry, WaterEntry, WorkoutEntry, SleepEntry,
  WeightEntry, HealthGoal, HealthRestriction, HealthState
} from '../types/health';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const DEFAULT_GOALS: HealthGoal[] = [
  { id: 'g1', label: 'Daily Calories', type: 'calories', targetValue: 1700, unit: 'kcal', createdAt: new Date().toISOString() },
  { id: 'g2', label: 'Daily Water', type: 'water', targetValue: 3000, unit: 'ml', createdAt: new Date().toISOString() },
  { id: 'g3', label: 'Daily Protein', type: 'protein', targetValue: 120, unit: 'g', createdAt: new Date().toISOString() },
  { id: 'g4', label: 'Daily Steps', type: 'steps', targetValue: 10000, unit: 'steps', createdAt: new Date().toISOString() },
  { id: 'g5', label: 'Sleep Hours', type: 'sleep_hours', targetValue: 8, unit: 'h', createdAt: new Date().toISOString() },
  { id: 'g6', label: 'Workouts / Week', type: 'workouts_per_week', targetValue: 5, unit: 'sessions', createdAt: new Date().toISOString() },
  { id: 'g7', label: 'Daily Skips', type: 'custom', targetValue: 800, unit: 'skips', createdAt: new Date().toISOString() },
];

const DEFAULT_RESTRICTIONS: HealthRestriction[] = [
  { id: 'r1', label: 'Calorie Cap', type: 'calorie_cap', limitValue: 1700, unit: 'kcal', enabled: true },
  { id: 'r2', label: 'Sugar Cap', type: 'sugar_cap', limitValue: 25, unit: 'g', enabled: true },
  { id: 'r3', label: 'Junk Meals / Week', type: 'junk_meals_per_week', limitValue: 2, unit: 'meals', enabled: true },
  { id: 'r4', label: 'Caffeine / Day', type: 'caffeine_per_day', limitValue: 2, unit: 'cups', enabled: true },
];

export const useHealthStore = create<HealthState>()(
  persist(
    (set, get) => ({
      meals: [],
      water: [],
      workouts: [],
      sleep: [],
      weight: [],
      goals: DEFAULT_GOALS,
      restrictions: DEFAULT_RESTRICTIONS,
      steps: {},

      // ─── Meals ───────────────────────────────────────────────────────────
      addMeal: (meal) => set(s => ({ meals: [{ ...meal, id: uid() }, ...s.meals] })),
      updateMeal: (id, updates) => set(s => ({ meals: s.meals.map(m => m.id === id ? { ...m, ...updates } : m) })),
      deleteMeal: (id) => set(s => ({ meals: s.meals.filter(m => m.id !== id) })),
      toggleMealFavorite: (id) => set(s => ({
        meals: s.meals.map(m => m.id === id ? { ...m, isFavorite: !m.isFavorite } : m)
      })),

      // ─── Water ───────────────────────────────────────────────────────────
      addWater: (entry) => set(s => ({ water: [{ ...entry, id: uid() }, ...s.water] })),
      deleteWater: (id) => set(s => ({ water: s.water.filter(w => w.id !== id) })),

      // ─── Steps ───────────────────────────────────────────────────────────
      logSteps: (date, steps) => set(s => ({ steps: { ...s.steps, [date]: steps } })),

      // ─── Workouts ────────────────────────────────────────────────────────
      addWorkout: (workout) => set(s => ({ workouts: [{ ...workout, id: uid() }, ...s.workouts] })),
      updateWorkout: (id, updates) => set(s => ({ workouts: s.workouts.map(w => w.id === id ? { ...w, ...updates } : w) })),
      deleteWorkout: (id) => set(s => ({ workouts: s.workouts.filter(w => w.id !== id) })),

      // ─── Sleep ───────────────────────────────────────────────────────────
      addSleep: (entry) => set(s => ({ sleep: [{ ...entry, id: uid() }, ...s.sleep] })),
      updateSleep: (id, updates) => set(s => ({ sleep: s.sleep.map(sl => sl.id === id ? { ...sl, ...updates } : sl) })),
      deleteSleep: (id) => set(s => ({ sleep: s.sleep.filter(sl => sl.id !== id) })),

      // ─── Weight ──────────────────────────────────────────────────────────
      addWeight: (entry) => set(s => ({ weight: [{ ...entry, id: uid() }, ...s.weight] })),
      deleteWeight: (id) => set(s => ({ weight: s.weight.filter(w => w.id !== id) })),

      // ─── Goals ───────────────────────────────────────────────────────────
      addGoal: (goal) => set(s => ({
        goals: [...s.goals, { ...goal, id: uid(), createdAt: new Date().toISOString() }]
      })),
      updateGoal: (id, updates) => set(s => ({
        goals: s.goals.map(g => g.id === id ? { ...g, ...updates } : g)
      })),
      deleteGoal: (id) => set(s => ({ goals: s.goals.filter(g => g.id !== id) })),

      // ─── Restrictions ────────────────────────────────────────────────────
      addRestriction: (r) => set(s => ({
        restrictions: [...s.restrictions, { ...r, id: uid() }]
      })),
      updateRestriction: (id, updates) => set(s => ({
        restrictions: s.restrictions.map(r => r.id === id ? { ...r, ...updates } : r)
      })),
      deleteRestriction: (id) => set(s => ({
        restrictions: s.restrictions.filter(r => r.id !== id)
      })),
    }),
    {
      name: 'health-storage-v2',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ─── Derived selectors ────────────────────────────────────────────────────────
export function getTodayHealthData(store: HealthState, today: string) {
  const meals = store.meals.filter(m => m.date === today);
  const water = store.water.filter(w => w.date === today);
  const workouts = store.workouts.filter(w => w.date === today);
  const sleepEntry = store.sleep.find(s => s.date === today);
  const latestWeight = store.weight[0] ?? null;
  const steps = store.steps[today] ?? 0;

  const totalCalories = meals.reduce((a, m) => a + m.calories, 0);
  const totalWaterMl = water.reduce((a, w) => a + w.amount, 0);
  const totalProtein = meals.reduce((a, m) => a + m.protein, 0);
  const totalCarbs = meals.reduce((a, m) => a + m.carbs, 0);
  const totalFat = meals.reduce((a, m) => a + m.fat, 0);
  const totalWorkoutMinutes = workouts.reduce((a, w) => a + w.durationMinutes, 0);

  return {
    meals, water, workouts, sleepEntry, latestWeight, steps,
    totalCalories, totalWaterMl, totalProtein, totalCarbs, totalFat, totalWorkoutMinutes
  };
}

export function computeHealthScore(
  totalCalories: number, calorieGoal: number,
  totalWaterMl: number, waterGoal: number,
  totalProtein: number, proteinGoal: number,
  sleepMinutes: number, sleepGoal: number,
  hasWorkedOut: boolean
): number {
  const safeCalorieGoal = Math.max(calorieGoal, 1);
  const safeWaterGoal = Math.max(waterGoal, 1);
  const safeProteinGoal = Math.max(proteinGoal, 1);
  const safeSleepGoalMinutes = Math.max(sleepGoal * 60, 1);

  const calScore = Math.min(totalCalories / safeCalorieGoal, 1) * 20;
  const waterScore = Math.min(totalWaterMl / safeWaterGoal, 1) * 20;
  const proteinScore = Math.min(totalProtein / safeProteinGoal, 1) * 20;
  const sleepScore = Math.min(sleepMinutes / safeSleepGoalMinutes, 1) * 25;
  const workoutScore = hasWorkedOut ? 15 : 0;
  return Math.round(calScore + waterScore + proteinScore + sleepScore + workoutScore);
}
