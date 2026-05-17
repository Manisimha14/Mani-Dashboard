import type { Variants } from 'framer-motion';

export interface FocusSession {
  id: string;
  completed: boolean;
  withered?: boolean;
  failed?: boolean;
  duration: number;
  actualDuration?: number;
  startTime?: string;
  endTime?: string;
  date?: string;
}

export interface Problem {
  id: string;
  title?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  completed: boolean;
}

export interface BiometricStats {
  avgWaterL: string;
  avgSleepHrs: string;
  avgCalories: number;
  totalWorkouts: number;
}

export interface FocusStreak {
  currentStreak: number;
}

export interface TerminalMessage {
  type: 'command' | 'response' | 'system';
  lines: string[];
}

export interface TerminalContext {
  focusSessions: FocusSession[];
  problems: Problem[];
  biometricStats: BiometricStats;
  focusStreak: FocusStreak;
  activityData: any[];
  biometricActivityData: any[];
  onNavigate: (path: string) => void;
  onLogWater: (amount: number) => void;
  onLogCalories: (amount: number) => void;
}
