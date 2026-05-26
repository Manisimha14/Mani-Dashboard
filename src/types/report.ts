import type { FocusSession, LeetCodeProblem } from './index';
import type { WaterEntry, SleepEntry, WorkoutEntry } from './health';

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
  streakDays: number;
  milestoneText: string;
}

export interface ReportMetricCard {
  id: string;
  label: string;
  value: string;
  subtitle: string;
  targetLabel: string;
  deltaPct: number;
  deltaLabel: string;
  direction: 'up' | 'down' | 'flat';
  progressPct?: number;
  source: string;
}

export interface DailyReportPoint {
  date: string;
  shortLabel: string;
  fullLabel: string;
  focusMinutes: number;
  focusSessions: number;
  codingSolved: number;
  codingNames: string[];
  hydrationMl: number;
  sleepMinutes: number;
  steps: number;
  caloriesIn: number;
  caloriesOut: number;
  readingChapters: number;
  workoutCount: number;
  workoutMinutes: number;
  workoutNames: string[];
}

export interface WeeklyComparisonRow {
  id: string;
  label: string;
  currentValue: string;
  previousValue: string;
  deltaPct: number;
  direction: 'up' | 'down' | 'flat';
  source: string;
}

export interface ValidatedInsight {
  id: string;
  title: string;
  body: string;
  confidence: 'high' | 'medium';
  source: string;
}

export interface RadarMetric {
  label: string;
  value: number;
}

export interface CodingTopicWeakness {
  topic: string;
  outstandingCount: number;
}

export interface CodingRevisitItem {
  name: string;
  difficulty: string;
  topic: string;
  date: string;
}

export interface WeeklyCodingAnalytics {
  acceptanceStreakDays: number;
  hardestSolvedProblem: string | null;
  averageSolveTimeMinutes: number | null;
  topicWeaknessMap: CodingTopicWeakness[];
  revisitFailureList: CodingRevisitItem[];
  spacedRepetitionQueue: CodingRevisitItem[];
}

export interface MetricSource {
  id: string;
  label: string;
  source: string;
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
  sleepCalendarAverageH?: string;
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
  totalCaloriesTaken: number;
  totalCaloriesBurnt: number;
  totalWaterIntakeMl: number;
  trackerSummaries: CustomTrackerWeeklySummary[];

  cycleStart: string;
  cycleEnd: string;
  previousCycleStart: string;
  previousCycleEnd: string;
  weeklyPerformanceScore: number;
  statusLabel: string;
  statusTone: 'emerald' | 'amber' | 'rose' | 'violet';
  heroMetrics: ReportMetricCard[];
  dailyBreakdown: DailyReportPoint[];
  comparisonRows: WeeklyComparisonRow[];
  validatedInsights: ValidatedInsight[];
  insightsFallback: string | null;
  weeklyNarrative: string;
  longestFocusStreakDays: number;
  bestCodingStreakDays: number;
  strongestDayLabel: string;
  strongestDayReason: string;
  biggestImprovement: string;
  customTrackerCards: CustomTrackerWeeklySummary[];
  radarMetrics: RadarMetric[];
  codingAnalytics: WeeklyCodingAnalytics;
  metricSources: MetricSource[];
}
