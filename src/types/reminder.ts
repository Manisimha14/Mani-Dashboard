export type ReminderRecurrence = 
  | 'none' 
  | 'daily' 
  | 'weekly' 
  | 'monthly' 
  | 'weekdays' 
  | 'weekends' 
  | 'custom';

export type ReminderCategory = 
  | 'reading' 
  | 'coding' 
  | 'focus' 
  | 'habit' 
  | 'goal' 
  | 'streak' 
  | 'system' 
  | 'custom';

export type ReminderType = 
  | 'one-time'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'custom'
  | 'streak-protection'
  | 'inactivity'
  | 'deadline'
  | 'focus'
  | 'reading'
  | 'leetcode'
  | 'task';

export interface Reminder {
  id: string;
  title: string;
  message: string;
  category: ReminderCategory;
  type: ReminderType;
  scheduledAt: string; // ISO string
  recurrence: ReminderRecurrence;
  enabled: boolean;
  completed: boolean;
  snoozedUntil?: string; // ISO string
  lastTriggeredAt?: string; // ISO string
  createdAt: string;
  updatedAt: string;
  smartRules?: {
    triggerOnInactivityHours?: number;
    triggerOnStreakAtRisk?: boolean;
    triggerOnGoalBehind?: boolean;
  };
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: 'reminders' | 'streak' | 'achievements' | 'focus' | 'productivity' | 'goals';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  metadata?: any;
}

export interface ReminderSettings {
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string;   // "07:00"
  };
  muteWeekends: boolean;
  muteDuringFocus: boolean;
  soundEnabled: boolean;
  smartRemindersEnabled: boolean;
  browserNotificationsEnabled: boolean;
}
