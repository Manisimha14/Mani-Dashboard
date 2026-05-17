// ─── Health Module Types ──────────────────────────────────────────────────────

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'custom';
export type WorkoutType =
  | 'strength' | 'cardio' | 'running' | 'walking' | 'cycling'
  | 'yoga' | 'stretching' | 'sports' | 'custom';
export type SleepQuality = 1 | 2 | 3 | 4 | 5;
export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

export interface MealEntry {
  id: string;
  date: string;          // YYYY-MM-DD
  time: string;          // HH:MM
  mealType: MealType;
  name: string;
  calories: number;
  protein: number;       // grams
  carbs: number;         // grams
  fat: number;           // grams
  fiber?: number;        // grams
  quantity?: string;     // e.g. "2 eggs", "1 cup"
  isFavorite?: boolean;
}

export interface WaterEntry {
  id: string;
  date: string;
  time: string;
  amount: number;        // millilitres
}

export interface WorkoutEntry {
  id: string;
  date: string;
  startTime: string;
  name: string;
  type: WorkoutType;
  durationMinutes: number;
  caloriesBurned?: number;
  notes?: string;
}

export interface SleepEntry {
  id: string;
  date: string;          // date of the wake-up day
  sleepTime: string;     // HH:MM  (could be previous day)
  wakeTime: string;      // HH:MM
  totalMinutes: number;
  quality: SleepQuality;
  energyLevel?: EnergyLevel;
  notes?: string;
}

export interface WeightEntry {
  id: string;
  date: string;
  weight: number;        // kg
  bodyFatPercent?: number;
  waistCm?: number;
  notes?: string;
}

export interface HealthGoal {
  id: string;
  label: string;
  type: 'calories' | 'water' | 'steps' | 'protein' | 'workouts_per_week'
      | 'weight_target' | 'sleep_hours' | 'custom';
  targetValue: number;
  unit: string;
  deadline?: string;
  createdAt: string;
}

export interface HealthRestriction {
  id: string;
  label: string;
  type: 'calorie_cap' | 'sugar_cap' | 'junk_meals_per_week'
      | 'caffeine_per_day' | 'custom';
  limitValue: number;
  unit: string;
  enabled: boolean;
}

// Daily aggregated snapshot (computed, stored for perf)
export interface HealthDaySnapshot {
  date: string;
  totalCaloriesIn: number;
  totalCaloriesBurned: number;
  totalWaterMl: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  steps: number;
  workoutMinutes: number;
  sleepMinutes: number;
  sleepQuality?: SleepQuality;
  weightKg?: number;
  performanceScore: number;     // 0-100 composite
}

export interface HealthState {
  meals: MealEntry[];
  water: WaterEntry[];
  workouts: WorkoutEntry[];
  sleep: SleepEntry[];
  weight: WeightEntry[];
  goals: HealthGoal[];
  restrictions: HealthRestriction[];
  steps: Record<string, number>;   // date -> step count

  // actions
  addMeal: (meal: Omit<MealEntry, 'id'>) => void;
  updateMeal: (id: string, updates: Partial<MealEntry>) => void;
  deleteMeal: (id: string) => void;
  toggleMealFavorite: (id: string) => void;

  addWater: (entry: Omit<WaterEntry, 'id'>) => void;
  deleteWater: (id: string) => void;
  logSteps: (date: string, steps: number) => void;

  addWorkout: (workout: Omit<WorkoutEntry, 'id'>) => void;
  updateWorkout: (id: string, updates: Partial<WorkoutEntry>) => void;
  deleteWorkout: (id: string) => void;

  addSleep: (entry: Omit<SleepEntry, 'id'>) => void;
  updateSleep: (id: string, updates: Partial<SleepEntry>) => void;
  deleteSleep: (id: string) => void;

  addWeight: (entry: Omit<WeightEntry, 'id'>) => void;
  deleteWeight: (id: string) => void;

  addGoal: (goal: Omit<HealthGoal, 'id' | 'createdAt'>) => void;
  updateGoal: (id: string, updates: Partial<HealthGoal>) => void;
  deleteGoal: (id: string) => void;

  addRestriction: (r: Omit<HealthRestriction, 'id'>) => void;
  updateRestriction: (id: string, updates: Partial<HealthRestriction>) => void;
  deleteRestriction: (id: string) => void;
}
