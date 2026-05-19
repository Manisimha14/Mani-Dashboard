import type { FocusSession, LeetCodeProblem } from './index';
import type { WaterEntry, SleepEntry, WorkoutEntry } from './health';

export interface IndexedReportData {
  sessionsMap: Map<string, FocusSession[]>;
  waterMap: Map<string, WaterEntry[]>;
  sleepMap: Map<string, SleepEntry>;
  workoutsMap: Map<string, WorkoutEntry[]>;
  problemsMap: Map<string, LeetCodeProblem[]>;
}

export interface WeeklyReportStats {
  focusMinutes: number;
  completedSessions: number;
  completionRate: number;
  focusQualityScore: number;
  problemsSolved: number;
  waterAverageL: string;
  sleepAverageH: string;
  workoutCount: number;
  stepsAverage: number;
  focusChange: number;
  codingChange: number;
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
  focusChartData: number[];
  codingChartData: number[];
  waterChartData: number[];
  sleepChartData: number[];
  sleepDaysWithData: number;
}
