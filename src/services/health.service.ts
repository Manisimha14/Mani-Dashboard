/**
 * Health Service — all Supabase CRUD for the health domain.
 * Maps between camelCase frontend types ↔ snake_case DB columns.
 * All functions require a user_id and are always called after auth check.
 */
import { supabase } from '../lib/supabase';
import type {
  MealEntry, WaterEntry, WorkoutEntry, SleepEntry,
  WeightEntry, HealthGoal, HealthRestriction,
} from '../types/health';

// ─── Mappers: DB row → Frontend type ──────────────────────────────────────────

function rowToMeal(r: any): MealEntry {
  return {
    id: r.id, date: r.date, time: r.time,
    mealType: r.meal_type, name: r.name,
    calories: r.calories, protein: Number(r.protein),
    carbs: Number(r.carbs), fat: Number(r.fat),
    fiber: r.fiber != null ? Number(r.fiber) : undefined,
    quantity: r.quantity ?? undefined,
    isFavorite: r.is_favorite,
  };
}

function rowToWater(r: any): WaterEntry {
  return { id: r.id, date: r.date, time: r.time, amount: r.amount };
}

function rowToWorkout(r: any): WorkoutEntry {
  return {
    id: r.id, date: r.date, startTime: r.start_time,
    name: r.name, type: r.type, durationMinutes: r.duration_minutes,
    caloriesBurned: r.calories_burned ?? undefined,
    notes: r.notes ?? undefined,
  };
}

function rowToSleep(r: any): SleepEntry {
  return {
    id: r.id, date: r.date, sleepTime: r.sleep_time, wakeTime: r.wake_time,
    totalMinutes: r.total_minutes, quality: r.quality,
    energyLevel: r.energy_level ?? undefined,
    notes: r.notes ?? undefined,
  };
}

function rowToWeight(r: any): WeightEntry {
  return {
    id: r.id, date: r.date, weight: Number(r.weight),
    bodyFatPercent: r.body_fat_percent != null ? Number(r.body_fat_percent) : undefined,
    waistCm: r.waist_cm != null ? Number(r.waist_cm) : undefined,
    notes: r.notes ?? undefined,
  };
}

function rowToGoal(r: any): HealthGoal {
  return {
    id: r.id, label: r.label, type: r.type,
    targetValue: Number(r.target_value), unit: r.unit,
    deadline: r.deadline ?? undefined,
    createdAt: r.created_at,
  };
}

function rowToRestriction(r: any): HealthRestriction {
  return {
    id: r.id, label: r.label, type: r.type,
    limitValue: Number(r.limit_value), unit: r.unit,
    enabled: r.enabled,
  };
}

// ─── Meals ────────────────────────────────────────────────────────────────────

export async function fetchMeals(userId: string, date?: string): Promise<MealEntry[]> {
  let q = supabase.from('health_meals').select('*').eq('user_id', userId).order('date', { ascending: false }).order('time', { ascending: false });
  if (date) q = q.eq('date', date);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(rowToMeal);
}

export async function insertMeal(userId: string, meal: Omit<MealEntry, 'id'>): Promise<MealEntry> {
  const { data, error } = await supabase.from('health_meals').insert({
    user_id: userId, date: meal.date, time: meal.time,
    meal_type: meal.mealType, name: meal.name,
    calories: meal.calories, protein: meal.protein,
    carbs: meal.carbs, fat: meal.fat,
    fiber: meal.fiber ?? null, quantity: meal.quantity ?? null,
    is_favorite: meal.isFavorite ?? false,
  }).select().single();
  if (error) throw error;
  return rowToMeal(data);
}

export async function updateMeal(id: string, updates: Partial<MealEntry>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.mealType !== undefined)  patch.meal_type   = updates.mealType;
  if (updates.name !== undefined)      patch.name        = updates.name;
  if (updates.calories !== undefined)  patch.calories    = updates.calories;
  if (updates.protein !== undefined)   patch.protein     = updates.protein;
  if (updates.carbs !== undefined)     patch.carbs       = updates.carbs;
  if (updates.fat !== undefined)       patch.fat         = updates.fat;
  if (updates.fiber !== undefined)     patch.fiber       = updates.fiber;
  if (updates.quantity !== undefined)  patch.quantity    = updates.quantity;
  if (updates.isFavorite !== undefined) patch.is_favorite = updates.isFavorite;
  const { error } = await supabase.from('health_meals').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteMeal(id: string): Promise<void> {
  const { error } = await supabase.from('health_meals').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleMealFavorite(id: string, current: boolean): Promise<void> {
  const { error } = await supabase.from('health_meals').update({ is_favorite: !current }).eq('id', id);
  if (error) throw error;
}

// ─── Water ────────────────────────────────────────────────────────────────────

export async function fetchWater(userId: string, date?: string): Promise<WaterEntry[]> {
  let q = supabase.from('health_water').select('*').eq('user_id', userId).order('date', { ascending: false }).order('time', { ascending: false });
  if (date) q = q.eq('date', date);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(rowToWater);
}

export async function insertWater(userId: string, entry: Omit<WaterEntry, 'id'>): Promise<WaterEntry> {
  const { data, error } = await supabase.from('health_water').insert({
    user_id: userId, date: entry.date, time: entry.time, amount: entry.amount,
  }).select().single();
  if (error) throw error;
  return rowToWater(data);
}

export async function deleteWater(id: string): Promise<void> {
  const { error } = await supabase.from('health_water').delete().eq('id', id);
  if (error) throw error;
}

// ─── Steps ────────────────────────────────────────────────────────────────────

export async function fetchSteps(userId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('health_steps').select('date, steps').eq('user_id', userId);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map(r => [r.date, r.steps]));
}

export async function upsertSteps(userId: string, date: string, steps: number): Promise<void> {
  const { error } = await supabase.from('health_steps').upsert(
    { user_id: userId, date, steps },
    { onConflict: 'user_id,date' }
  );
  if (error) throw error;
}

// ─── Workouts ─────────────────────────────────────────────────────────────────

export async function fetchWorkouts(userId: string, date?: string): Promise<WorkoutEntry[]> {
  let q = supabase.from('health_workouts').select('*').eq('user_id', userId).order('date', { ascending: false });
  if (date) q = q.eq('date', date);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(rowToWorkout);
}

export async function insertWorkout(userId: string, w: Omit<WorkoutEntry, 'id'>): Promise<WorkoutEntry> {
  const { data, error } = await supabase.from('health_workouts').insert({
    user_id: userId, date: w.date, start_time: w.startTime,
    name: w.name, type: w.type, duration_minutes: w.durationMinutes,
    calories_burned: w.caloriesBurned ?? null, notes: w.notes ?? null,
  }).select().single();
  if (error) throw error;
  return rowToWorkout(data);
}

export async function updateWorkout(id: string, updates: Partial<WorkoutEntry>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.name !== undefined)           patch.name             = updates.name;
  if (updates.type !== undefined)           patch.type             = updates.type;
  if (updates.durationMinutes !== undefined) patch.duration_minutes = updates.durationMinutes;
  if (updates.caloriesBurned !== undefined)  patch.calories_burned  = updates.caloriesBurned;
  if (updates.notes !== undefined)          patch.notes            = updates.notes;
  const { error } = await supabase.from('health_workouts').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteWorkout(id: string): Promise<void> {
  const { error } = await supabase.from('health_workouts').delete().eq('id', id);
  if (error) throw error;
}

// ─── Sleep ────────────────────────────────────────────────────────────────────

export async function fetchSleep(userId: string): Promise<SleepEntry[]> {
  const { data, error } = await supabase.from('health_sleep').select('*').eq('user_id', userId).order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToSleep);
}

export async function upsertSleep(userId: string, entry: Omit<SleepEntry, 'id'>): Promise<SleepEntry> {
  const { data, error } = await supabase.from('health_sleep').upsert({
    user_id: userId, date: entry.date, sleep_time: entry.sleepTime,
    wake_time: entry.wakeTime, total_minutes: entry.totalMinutes,
    quality: entry.quality, energy_level: entry.energyLevel ?? null,
    notes: entry.notes ?? null,
  }, { onConflict: 'user_id,date' }).select().single();
  if (error) throw error;
  return rowToSleep(data);
}

export async function updateSleep(id: string, updates: Partial<SleepEntry>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.sleepTime !== undefined)    patch.sleep_time    = updates.sleepTime;
  if (updates.wakeTime !== undefined)     patch.wake_time     = updates.wakeTime;
  if (updates.totalMinutes !== undefined) patch.total_minutes = updates.totalMinutes;
  if (updates.quality !== undefined)      patch.quality       = updates.quality;
  if (updates.energyLevel !== undefined)  patch.energy_level  = updates.energyLevel;
  if (updates.notes !== undefined)        patch.notes         = updates.notes;
  const { error } = await supabase.from('health_sleep').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteSleep(id: string): Promise<void> {
  const { error } = await supabase.from('health_sleep').delete().eq('id', id);
  if (error) throw error;
}

// ─── Weight ───────────────────────────────────────────────────────────────────

export async function fetchWeight(userId: string): Promise<WeightEntry[]> {
  const { data, error } = await supabase.from('health_weight').select('*').eq('user_id', userId).order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToWeight);
}

export async function insertWeight(userId: string, entry: Omit<WeightEntry, 'id'>): Promise<WeightEntry> {
  const { data, error } = await supabase.from('health_weight').insert({
    user_id: userId, date: entry.date, weight: entry.weight,
    body_fat_percent: entry.bodyFatPercent ?? null,
    waist_cm: entry.waistCm ?? null, notes: entry.notes ?? null,
  }).select().single();
  if (error) throw error;
  return rowToWeight(data);
}

export async function deleteWeight(id: string): Promise<void> {
  const { error } = await supabase.from('health_weight').delete().eq('id', id);
  if (error) throw error;
}

// ─── Goals ────────────────────────────────────────────────────────────────────

export async function fetchGoals(userId: string): Promise<HealthGoal[]> {
  const { data, error } = await supabase.from('health_goals').select('*').eq('user_id', userId).order('created_at');
  if (error) throw error;
  return (data ?? []).map(rowToGoal);
}

export async function insertGoal(userId: string, goal: Omit<HealthGoal, 'id' | 'createdAt'>): Promise<HealthGoal> {
  const { data, error } = await supabase.from('health_goals').insert({
    user_id: userId, label: goal.label, type: goal.type,
    target_value: goal.targetValue, unit: goal.unit,
    deadline: goal.deadline ?? null,
  }).select().single();
  if (error) throw error;
  return rowToGoal(data);
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('health_goals').delete().eq('id', id);
  if (error) throw error;
}

export async function updateGoal(id: string, updates: Partial<HealthGoal>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.label !== undefined)       patch.label        = updates.label;
  if (updates.targetValue !== undefined) patch.target_value = updates.targetValue;
  if (updates.deadline !== undefined)    patch.deadline     = updates.deadline;
  const { error } = await supabase.from('health_goals').update(patch).eq('id', id);
  if (error) throw error;
}

// ─── Restrictions ─────────────────────────────────────────────────────────────

export async function fetchRestrictions(userId: string): Promise<HealthRestriction[]> {
  const { data, error } = await supabase.from('health_restrictions').select('*').eq('user_id', userId).order('created_at');
  if (error) throw error;
  return (data ?? []).map(rowToRestriction);
}

export async function insertRestriction(userId: string, r: Omit<HealthRestriction, 'id'>): Promise<HealthRestriction> {
  const { data, error } = await supabase.from('health_restrictions').insert({
    user_id: userId, label: r.label, type: r.type,
    limit_value: r.limitValue, unit: r.unit, enabled: r.enabled,
  }).select().single();
  if (error) throw error;
  return rowToRestriction(data);
}

export async function updateRestriction(id: string, updates: Partial<HealthRestriction>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.label !== undefined)      patch.label       = updates.label;
  if (updates.limitValue !== undefined) patch.limit_value = updates.limitValue;
  if (updates.enabled !== undefined)    patch.enabled     = updates.enabled;
  const { error } = await supabase.from('health_restrictions').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteRestriction(id: string): Promise<void> {
  const { error } = await supabase.from('health_restrictions').delete().eq('id', id);
  if (error) throw error;
}

// ─── Bulk insert for migration ────────────────────────────────────────────────

export async function bulkInsertHealthData(userId: string, data: {
  meals: Omit<MealEntry, 'id'>[];
  water: Omit<WaterEntry, 'id'>[];
  workouts: Omit<WorkoutEntry, 'id'>[];
  sleep: Omit<SleepEntry, 'id'>[];
  weight: Omit<WeightEntry, 'id'>[];
  steps: Record<string, number>;
  goals: Omit<HealthGoal, 'id' | 'createdAt'>[];
  restrictions: Omit<HealthRestriction, 'id'>[];
}): Promise<void> {
  const ops: any[] = [];

  if (data.meals.length)  ops.push(supabase.from('health_meals').insert(data.meals.map(m => ({ user_id: userId, date: m.date, time: m.time, meal_type: m.mealType, name: m.name, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat, fiber: m.fiber ?? null, quantity: m.quantity ?? null, is_favorite: m.isFavorite ?? false }))));
  if (data.water.length)  ops.push(supabase.from('health_water').insert(data.water.map(w => ({ user_id: userId, date: w.date, time: w.time, amount: w.amount }))));
  if (data.workouts.length) ops.push(supabase.from('health_workouts').insert(data.workouts.map(w => ({ user_id: userId, date: w.date, start_time: w.startTime, name: w.name, type: w.type, duration_minutes: w.durationMinutes, calories_burned: w.caloriesBurned ?? null, notes: w.notes ?? null }))));
  if (data.sleep.length)  ops.push(supabase.from('health_sleep').upsert(data.sleep.map(s => ({ user_id: userId, date: s.date, sleep_time: s.sleepTime, wake_time: s.wakeTime, total_minutes: s.totalMinutes, quality: s.quality, energy_level: s.energyLevel ?? null, notes: s.notes ?? null })), { onConflict: 'user_id,date' }));
  if (data.weight.length) ops.push(supabase.from('health_weight').insert(data.weight.map(w => ({ user_id: userId, date: w.date, weight: w.weight, body_fat_percent: w.bodyFatPercent ?? null, waist_cm: w.waistCm ?? null, notes: w.notes ?? null }))));

  const stepEntries = Object.entries(data.steps);
  if (stepEntries.length) ops.push(supabase.from('health_steps').upsert(stepEntries.map(([date, steps]) => ({ user_id: userId, date, steps })), { onConflict: 'user_id,date' }));
  if (data.goals.length)  ops.push(supabase.from('health_goals').insert(data.goals.map(g => ({ user_id: userId, label: g.label, type: g.type, target_value: g.targetValue, unit: g.unit, deadline: g.deadline ?? null }))));
  if (data.restrictions.length) ops.push(supabase.from('health_restrictions').insert(data.restrictions.map(r => ({ user_id: userId, label: r.label, type: r.type, limit_value: r.limitValue, unit: r.unit, enabled: r.enabled }))));

  await Promise.all(ops);
}
