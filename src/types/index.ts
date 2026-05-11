export * from './trackers';

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
  category: 'reading' | 'coding' | 'focus' | 'streak' | 'general';
  unlockedAt?: string;
  unlocked: boolean;
  progress?: number;
  target?: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// ─── Streak Types ────────────────────────────────────────────────────────────
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
  history: Record<string, boolean>; // date -> has activity
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
export type AppTheme = 'dark_pro' | 'oled' | 'cyberpunk' | 'forest' | 'nebula' | 'retro';

export interface UserSettings {
  theme: AppTheme;
  accentColor: string; // Hex color
  mood: AppMood;
  animationIntensity: 'none' | 'subtle' | 'full';
  reducedMotion: boolean;
  compactMode: boolean;
  customQuote?: string;
  name?: string;
  onboardingComplete: boolean;
  dashboardLayout: string[];
  petType: 'bonsai' | 'owl' | 'fox' | 'orb';
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
}
