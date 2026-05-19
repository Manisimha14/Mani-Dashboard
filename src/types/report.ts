import type { FocusSession, LeetCodeProblem, Tracker } from './index';
import type { WaterEntry, SleepEntry, WorkoutEntry, MealEntry } from './health';

export interface IndexedReportData {
  sessionsMap: Map<string, FocusSession[]>;
  waterMap: Map<string, WaterEntry[]>;
  sleepMap: Map<string, SleepEntry>;
  workoutsMap: Map<string, WorkoutEntry[]>;
  problemsMap: Map<string, LeetCodeProblem[]>;
}

export interface CustomTrackerWeeklySummary {
  trackerId: string;
  title: string;
  type: string;
  unit?: string;
  target?: number;
  completedCount: number;
  totalLogged: number;
  sumValue?: number;
  avgValue?: number;
}

export interface WeeklyReportStats {
  focusMinutes: number;
  completedSessions: number;
  completionRate: number;
  focusQualityScore: number;
  problemsSolved: number;
  chaptersRead: number;
  waterAverageL: string;
  sleepAverageH: string;
  workoutCount: number;
  stepsAverage: number;
  focusChange: number;
  codingChange: number;
  readingChange: number;
  waterChange: number;
  sleepChange: number;
  bestFocusDay: string;
  bestCodingDay: string;
  weakestSleepDay: string;
  problemsSolvedReflections: number;
  learningMinutesReflections: number;
  pagesReadReflections: number;
  featuresShippedReflections: number;
  correlationInsights: string[];
  wins: string[];
  risks: string[];
  recommendations: string[];
  actionPlan: string[];
  waterDaysHit: number;
  sleepDaysHit: number;
  problemsDaysHit: number;
  readingDaysHit: number;
  focusChartData: number[];
  codingChartData: number[];
  waterChartData: number[];
  sleepChartData: number[];
  readingChartData: number[];
  sleepDaysWithData: number;
  
  // Health extensions
  totalCaloriesTaken: number;
  totalCaloriesBurnt: number;
  totalWaterIntakeMl: number;
  
  // Custom Trackers
  trackerSummaries: CustomTrackerWeeklySummary[];
}
