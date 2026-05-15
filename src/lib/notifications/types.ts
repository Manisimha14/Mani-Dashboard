export type NotificationTone = 'fun' | 'motivation' | 'info' | 'success' | 'warning';
export type NotificationCategory = 'weather' | 'score' | 'streak' | 'time' | 'achievement' | 'system';

export interface ContextualMessage {
  id: string;
  title: string;
  message: string;
  tone: NotificationTone;
  category: NotificationCategory;
  icon?: string;
  priority?: number; // Higher is more important
  // Classification metadata
  scoreRange?: 'zero' | 'low' | 'mid' | 'high' | 'god';
  timeSegment?: 'morning' | 'afternoon' | 'evening' | 'late';
  streakType?: 'reading' | 'coding' | 'focus' | 'any';
}

export interface NotificationState {
  weatherType: string;
  prodScore: number;
  readingStreak: number;
  codingStreak: number;
  focusStreak: number;
  hour: number;
  humorLevel: 'minimal' | 'balanced' | 'chaotic';
}
