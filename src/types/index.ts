export * from './trackers';
export * from './launcher';
export type { Database } from './database';

// ─── Book Types ────────────────────────────────────────────────────────────
export interface Chapter {
  id: number;
  number: number;
  title: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completed: boolean;
  dateCompleted?: string;
  notes?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  chapters: Chapter[];
  startDate?: string;
  targetEndDate?: string;
  coverColor: string;
}

// ─── LeetCode Types ─────────────────────────────────────────────────────────
export type LeetCodeDifficulty = 'Easy' | 'Medium' | 'Hard';
export type LeetCodeStatus = 'solved' | 'attempted' | 'todo';

export interface LeetCodeProblem {
  id: string;
  date: string;
  name: string;
  link: string;
  difficulty: LeetCodeDifficulty;
  topic: string;
  status: LeetCodeStatus;
  completed: boolean;
  notes?: string;
  timeSpent?: number; // minutes
  silent?: boolean;
}

// ─── Pomodoro Types ─────────────────────────────────────────────────────────
export type PomodoroMode = 'focus' | 'short_break' | 'long_break';
export type GrowthTheme = 'tree' | 'crystal' | 'bonsai' | 'space' | 'cyber';
export type AmbienceType = 'rain' | 'forest' | 'cafe' | 'lofi' | 'white_noise' | 'keyboard' | 'space' | 'none';

export interface FocusSession {
  id: string;
  date: string;
  startTime: string;
  endTime?: string;
  duration: number; // minutes planned
  actualDuration?: number; // minutes actual
  completed: boolean;
  failed: boolean;
  taskName?: string;
  taskTags?: string[];
  growthTheme: GrowthTheme;
  ambience: AmbienceType;
  reflection?: string;
  mood?: string;
  productivityScore?: number;
  mode: PomodoroMode;
}

export interface PomodoroSettings {
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
  autoStartBreaks: boolean;
  growthTheme: GrowthTheme;
  ambience: AmbienceType;
  ambienceVolume: number;
  soundEnabled: boolean;
}

// ─── Achievement Types ───────────────────────────────────────────────────────
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'reading' | 'coding' | 'focus' | 'streak' | 'general' | 'health' | 'learning';
  unlockedAt?: string;
  unlocked: boolean;
  progress?: number;
  target?: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'legend';
  xpReward?: number;
  xpCategory?: 'focus' | 'health' | 'coding' | 'learning' | 'meta';
  secret?: boolean;
  boss?: boolean;
}

// ─── Streak Types ────────────────────────────────────────────────────────────
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
  history: Record<string, boolean | 'rest'>; // date -> has activity or rest
}

// ─── Analytics Types ─────────────────────────────────────────────────────────
export interface DailyActivity {
  date: string;
  chaptersRead: number;
  problemsSolved: number;
  focusMinutes: number;
  productivityScore: number;
}

// ─── User Settings ────────────────────────────────────────────────────────────
export type AppMood = 'focused' | 'chill' | 'grind' | 'zen' | 'creative';
export type ThemeVars = {
  '--bg-primary': string;
  '--bg-secondary': string;
  '--bg-card': string;
  '--border': string;
  '--text-primary': string;
  '--text-secondary': string;
  '--text-muted': string;
  '--success': string;
  '--warning': string;
  '--danger': string;
  '--accent-glow': string;
  '--card-shadow': string;
  '--radius-card': string;
  '--font-main': string;
};

export interface ThemeDefinition {
  id: AppTheme;
  name: string;
  emoji: string;
  description: string;
  vars: ThemeVars;
  previewColors: string[]; // [primary, secondary, accent]
}

export type AppTheme = 
  | 'dark_pro' | 'oled' | 'cyberpunk' | 'forest' | 'nebula' 
  | 'midnight_glass' | 'aurora' | 'hacker' | 'paper_warm' | 'solarized';

export interface UserSettings {
  theme: AppTheme;
  accentColor: string; 
  mood: AppMood;
  animationIntensity: 'none' | 'subtle' | 'full' | 'system';
  reducedMotion: boolean;
  compactMode: boolean;
  customQuote?: string;
  name?: string;
  onboardingComplete: boolean;
  dashboardLayout: string[];
  petType: 'bonsai' | 'owl' | 'fox' | 'orb';
  keyboardShortcuts: boolean;
  calorieCap?: number;
  calorieCapEnabled?: boolean;
  sugarCap?: number;
  sugarCapEnabled?: boolean;
  caffeineCap?: number;
  caffeineCapEnabled?: boolean;
  junkCapEnabled?: boolean;
  waterAlerts?: boolean;
  proteinAlerts?: boolean;
  focusAlerts?: boolean;
  streakAlerts?: boolean;
  deletedReports?: string[];
  leetcodeAlerts?: boolean;
  workoutAlerts?: boolean;
  scratchpadNote?: string;
  scratchpadTodos?: string;
  financeTransactions?: string;
  financeBudgetLimit?: number;
  simulateOffline?: boolean;
  pwaBadgingEnabled?: boolean;
  autoBackupEnabled?: boolean;
  autoBackupFrequencyHours?: number;
}

export interface XpLedgerEntry {
  id: string;
  amount: number;
  source: string;
  description: string;
  timestamp: string;
}

// ─── App State ────────────────────────────────────────────────────────────────
export interface AppState {
  book: Book | null;
  problems: LeetCodeProblem[];
  trackers: import('./trackers').Tracker[];
  focusSessions: FocusSession[];
  achievements: Achievement[];
  readingStreak: StreakData;
  codingStreak: StreakData;
  focusStreak: StreakData;
  pomodoroSettings: PomodoroSettings;
  userSettings: UserSettings;
  dailyActivity: DailyActivity[];
  xp: number;
  level: number;
  xpLedger: XpLedgerEntry[];
}

