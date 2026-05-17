/**
 * React Query hooks for the Health domain.
 *
 * Strategy:
 *   - When a user is logged in  → reads/writes go to Supabase
 *   - When no user (offline)    → falls through to useHealthStore (localStorage)
 *
 * Components can use these hooks transparently — they work in both modes.
 */
import {
  useQuery, useMutation, useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useHealthStore } from '../store/useHealthStore';
import { getTodayHealthData } from '../store/useHealthStore';
import * as HealthSvc from '../services/health.service';
import { todayString } from '../lib/utils';
import type {
  MealEntry, WaterEntry, WorkoutEntry, SleepEntry,
  WeightEntry, HealthGoal, HealthRestriction,
} from '../types/health';

// ─── Query key factory ────────────────────────────────────────────────────────
export const healthKeys = {
  all:          (uid: string) => ['health', uid] as const,
  meals:        (uid: string, date?: string) => ['health', uid, 'meals',    date] as const,
  water:        (uid: string, date?: string) => ['health', uid, 'water',    date] as const,
  workouts:     (uid: string, date?: string) => ['health', uid, 'workouts', date] as const,
  sleep:        (uid: string)               => ['health', uid, 'sleep'] as const,
  weight:       (uid: string)               => ['health', uid, 'weight'] as const,
  steps:        (uid: string)               => ['health', uid, 'steps'] as const,
  goals:        (uid: string)               => ['health', uid, 'goals'] as const,
  restrictions: (uid: string)               => ['health', uid, 'restrictions'] as const,
};

// ─── Convenience: full today snapshot (mirrors getTodayHealthData) ─────────────
export function useTodayHealthData() {
  const { user } = useAuth();
  const today = todayString();
  const localStore = useHealthStore();

  // When online, grab data from the individual queries below.
  // Compute the same aggregates getTodayHealthData produces.
  const mealsQ    = useMeals(today);
  const waterQ    = useWater(today);
  const workoutsQ = useWorkouts(today);
  const sleepQ    = useSleepEntries();
  const stepsQ    = useSteps();

  if (!user) {
    // Offline — use Zustand directly
    return getTodayHealthData(localStore, today);
  }

  const meals    = mealsQ.data    ?? [];
  const water    = waterQ.data    ?? [];
  const workouts = workoutsQ.data ?? [];
  const sleepEntry = (sleepQ.data ?? []).find(s => s.date === today);
  const steps    = (stepsQ.data ?? {})[today] ?? 0;

  return {
    meals, water, workouts, sleepEntry, steps,
    latestWeight: null, // pulled separately via useWeight
    totalCalories:      meals.reduce((a, m) => a + m.calories, 0),
    totalWaterMl:       water.reduce((a, w) => a + w.amount, 0),
    totalProtein:       meals.reduce((a, m) => a + m.protein, 0),
    totalCarbs:         meals.reduce((a, m) => a + m.carbs, 0),
    totalFat:           meals.reduce((a, m) => a + m.fat, 0),
    totalWorkoutMinutes: workouts.reduce((a, w) => a + w.durationMinutes, 0),
  };
}

// ─── Meals ────────────────────────────────────────────────────────────────────

export function useMeals(date?: string) {
  const { user } = useAuth();
  const localStore = useHealthStore();

  return useQuery({
    queryKey: healthKeys.meals(user?.id ?? 'local', date),
    queryFn: () => user
      ? HealthSvc.fetchMeals(user.id, date)
      : Promise.resolve(localStore.meals.filter(m => !date || m.date === date)),
  });
}

export function useAddMeal(): UseMutationResult<unknown, Error, Omit<MealEntry, 'id'>> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useHealthStore();

  return useMutation({
    mutationFn: async (meal): Promise<unknown> => user
      ? HealthSvc.insertMeal(user.id, meal)
      : localStore.addMeal(meal),
    onSuccess: (_, meal) => {
      qc.invalidateQueries({ queryKey: healthKeys.meals(user?.id ?? 'local', meal.date) });
      qc.invalidateQueries({ queryKey: healthKeys.meals(user?.id ?? 'local') });
    },
  });
}

export function useUpdateMeal(): UseMutationResult<void, Error, { id: string; updates: Partial<MealEntry> }> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useHealthStore();

  return useMutation({
    mutationFn: ({ id, updates }) => user
      ? HealthSvc.updateMeal(id, updates)
      : Promise.resolve(localStore.updateMeal(id, updates)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health', user?.id ?? 'local', 'meals'] });
    },
  });
}

export function useDeleteMeal(): UseMutationResult<void, Error, string> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useHealthStore();

  return useMutation({
    mutationFn: (id) => user
      ? HealthSvc.deleteMeal(id)
      : Promise.resolve(localStore.deleteMeal(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health', user?.id ?? 'local', 'meals'] });
    },
  });
}

export function useToggleMealFavorite(): UseMutationResult<void, Error, { id: string; current: boolean }> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useHealthStore();

  return useMutation({
    mutationFn: ({ id, current }) => user
      ? HealthSvc.toggleMealFavorite(id, current)
      : Promise.resolve(localStore.toggleMealFavorite(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health', user?.id ?? 'local', 'meals'] });
    },
  });
}

// ─── Water ────────────────────────────────────────────────────────────────────

export function useWater(date?: string) {
  const { user } = useAuth();
  const localStore = useHealthStore();

  return useQuery({
    queryKey: healthKeys.water(user?.id ?? 'local', date),
    queryFn: () => user
      ? HealthSvc.fetchWater(user.id, date)
      : Promise.resolve(localStore.water.filter(w => !date || w.date === date)),
  });
}

export function useAddWater(): UseMutationResult<unknown, Error, Omit<WaterEntry, 'id'>> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useHealthStore();

  return useMutation({
    mutationFn: async (entry): Promise<unknown> => user
      ? HealthSvc.insertWater(user.id, entry)
      : localStore.addWater(entry),
    onSuccess: (_, entry) => {
      qc.invalidateQueries({ queryKey: healthKeys.water(user?.id ?? 'local', entry.date) });
      qc.invalidateQueries({ queryKey: healthKeys.water(user?.id ?? 'local') });
    },
  });
}

export function useDeleteWater(): UseMutationResult<void, Error, string> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useHealthStore();

  return useMutation({
    mutationFn: (id) => user
      ? HealthSvc.deleteWater(id)
      : Promise.resolve(localStore.deleteWater(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health', user?.id ?? 'local', 'water'] });
    },
  });
}

// ─── Steps ────────────────────────────────────────────────────────────────────

export function useSteps() {
  const { user } = useAuth();
  const localStore = useHealthStore();

  return useQuery({
    queryKey: healthKeys.steps(user?.id ?? 'local'),
    queryFn: () => user
      ? HealthSvc.fetchSteps(user.id)
      : Promise.resolve(localStore.steps),
  });
}

export function useLogSteps(): UseMutationResult<void, Error, { date: string; steps: number }> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useHealthStore();

  return useMutation({
    mutationFn: ({ date, steps }) => user
      ? HealthSvc.upsertSteps(user.id, date, steps)
      : Promise.resolve(localStore.logSteps(date, steps)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: healthKeys.steps(user?.id ?? 'local') });
    },
  });
}

// ─── Workouts ─────────────────────────────────────────────────────────────────

export function useWorkouts(date?: string) {
  const { user } = useAuth();
  const localStore = useHealthStore();

  return useQuery({
    queryKey: healthKeys.workouts(user?.id ?? 'local', date),
    queryFn: () => user
      ? HealthSvc.fetchWorkouts(user.id, date)
      : Promise.resolve(localStore.workouts.filter(w => !date || w.date === date)),
  });
}

export function useAddWorkout(): UseMutationResult<unknown, Error, Omit<WorkoutEntry, 'id'>> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useHealthStore();

  return useMutation({
    mutationFn: async (w): Promise<unknown> => user
      ? HealthSvc.insertWorkout(user.id, w)
      : localStore.addWorkout(w),
    onSuccess: (_, w) => {
      qc.invalidateQueries({ queryKey: healthKeys.workouts(user?.id ?? 'local', w.date) });
      qc.invalidateQueries({ queryKey: healthKeys.workouts(user?.id ?? 'local') });
    },
  });
}

export function useDeleteWorkout(): UseMutationResult<void, Error, string> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useHealthStore();

  return useMutation({
    mutationFn: (id) => user
      ? HealthSvc.deleteWorkout(id)
      : Promise.resolve(localStore.deleteWorkout(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health', user?.id ?? 'local', 'workouts'] });
    },
  });
}

// ─── Sleep ────────────────────────────────────────────────────────────────────

export function useSleepEntries() {
  const { user } = useAuth();
  const localStore = useHealthStore();

  return useQuery({
    queryKey: healthKeys.sleep(user?.id ?? 'local'),
    queryFn: () => user
      ? HealthSvc.fetchSleep(user.id)
      : Promise.resolve(localStore.sleep),
  });
}

export function useAddSleep(): UseMutationResult<unknown, Error, Omit<SleepEntry, 'id'>> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useHealthStore();

  return useMutation({
    mutationFn: async (entry): Promise<unknown> => user
      ? HealthSvc.upsertSleep(user.id, entry)
      : localStore.addSleep(entry),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: healthKeys.sleep(user?.id ?? 'local') });
    },
  });
}

export function useUpdateSleep(): UseMutationResult<void, Error, { id: string; updates: Partial<SleepEntry> }> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useHealthStore();

  return useMutation({
    mutationFn: ({ id, updates }) => user
      ? HealthSvc.updateSleep(id, updates)
      : Promise.resolve(localStore.updateSleep(id, updates)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: healthKeys.sleep(user?.id ?? 'local') });
    },
  });
}

export function useDeleteSleep(): UseMutationResult<void, Error, string> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useHealthStore();

  return useMutation({
    mutationFn: (id) => user
      ? HealthSvc.deleteSleep(id)
      : Promise.resolve(localStore.deleteSleep(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: healthKeys.sleep(user?.id ?? 'local') });
    },
  });
}

// ─── Weight ───────────────────────────────────────────────────────────────────

export function useWeight() {
  const { user } = useAuth();
  const localStore = useHealthStore();

  return useQuery({
    queryKey: healthKeys.weight(user?.id ?? 'local'),
    queryFn: () => user
      ? HealthSvc.fetchWeight(user.id)
      : Promise.resolve(localStore.weight),
  });
}

export function useAddWeight(): UseMutationResult<unknown, Error, Omit<WeightEntry, 'id'>> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useHealthStore();

  return useMutation({
    mutationFn: async (entry): Promise<unknown> => user
      ? HealthSvc.insertWeight(user.id, entry)
      : localStore.addWeight(entry),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: healthKeys.weight(user?.id ?? 'local') });
    },
  });
}

export function useDeleteWeight(): UseMutationResult<void, Error, string> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useHealthStore();

  return useMutation({
    mutationFn: (id) => user
      ? HealthSvc.deleteWeight(id)
      : Promise.resolve(localStore.deleteWeight(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: healthKeys.weight(user?.id ?? 'local') });
    },
  });
}

// ─── Goals ────────────────────────────────────────────────────────────────────

export function useHealthGoals() {
  const { user } = useAuth();
  const localStore = useHealthStore();

  return useQuery({
    queryKey: healthKeys.goals(user?.id ?? 'local'),
    queryFn: () => user
      ? HealthSvc.fetchGoals(user.id)
      : Promise.resolve(localStore.goals),
  });
}

export function useAddGoal(): UseMutationResult<unknown, Error, Omit<HealthGoal, 'id' | 'createdAt'>> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useHealthStore();

  return useMutation({
    mutationFn: async (goal): Promise<unknown> => user
      ? HealthSvc.insertGoal(user.id, goal)
      : localStore.addGoal(goal),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: healthKeys.goals(user?.id ?? 'local') });
    },
  });
}

export function useDeleteGoal(): UseMutationResult<void, Error, string> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useHealthStore();

  return useMutation({
    mutationFn: (id) => user
      ? HealthSvc.deleteGoal(id)
      : Promise.resolve(localStore.deleteGoal(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: healthKeys.goals(user?.id ?? 'local') });
    },
  });
}

export function useUpdateGoal(): UseMutationResult<void, Error, { id: string; updates: Partial<HealthGoal> }> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useHealthStore();

  return useMutation({
    mutationFn: ({ id, updates }) => user
      ? HealthSvc.updateGoal(id, updates)
      : Promise.resolve(localStore.updateGoal(id, updates)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: healthKeys.goals(user?.id ?? 'local') });
    },
  });
}

// ─── Restrictions ─────────────────────────────────────────────────────────────

export function useHealthRestrictions() {
  const { user } = useAuth();
  const localStore = useHealthStore();

  return useQuery({
    queryKey: healthKeys.restrictions(user?.id ?? 'local'),
    queryFn: () => user
      ? HealthSvc.fetchRestrictions(user.id)
      : Promise.resolve(localStore.restrictions),
  });
}

export function useAddRestriction(): UseMutationResult<unknown, Error, Omit<HealthRestriction, 'id'>> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useHealthStore();

  return useMutation({
    mutationFn: async (r): Promise<unknown> => user
      ? HealthSvc.insertRestriction(user.id, r)
      : localStore.addRestriction(r),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: healthKeys.restrictions(user?.id ?? 'local') });
    },
  });
}

export function useUpdateRestriction(): UseMutationResult<void, Error, { id: string; updates: Partial<HealthRestriction> }> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useHealthStore();

  return useMutation({
    mutationFn: ({ id, updates }) => user
      ? HealthSvc.updateRestriction(id, updates)
      : Promise.resolve(localStore.updateRestriction(id, updates)),
    onSuccess: () => {
      if (user) qc.invalidateQueries({ queryKey: healthKeys.restrictions(user.id) });
    },
  });
}

export function useDeleteRestriction(): UseMutationResult<void, Error, string> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useHealthStore();

  return useMutation({
    mutationFn: (id) => user
      ? HealthSvc.deleteRestriction(id)
      : Promise.resolve(localStore.deleteRestriction(id)),
    onSuccess: () => {
      if (user) qc.invalidateQueries({ queryKey: healthKeys.restrictions(user.id) });
    },
  });
}
