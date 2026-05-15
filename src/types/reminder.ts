/**
 * Utility types for stricter type safety
 */
export type ISODateString = string & { readonly __brand: 'ISODateString' };
export type HHMMString = string & { readonly __brand: 'HHMMString' }; // Format: "HH:mm"

export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];

export type AppRoute = '/focus' | '/reading' | '/leetcode' | '/analytics' | '/trackers' | '/dashboard';

/**
 * Audit fields for tracking creation and modification
 */
export interface Auditable {
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type ReminderRecurrence = 
  | 'none' 
  | 'daily' 
  | 'weekly' 
  | 'monthly' 
  | 'weekdays' 
  | 'weekends' 
  | 'custom';

export type ReminderDomain = 
  | 'reading' 
  | 'leetcode' 
  | 'focus' 
  | 'habit' 
  | 'goal' 
  | 'streak' 
  | 'task'
  | 'system' 
  | 'custom';

export type ScheduleType = 'one-time' | 'recurring' | 'smart';

export type ReminderStatus = 'active' | 'snoozed' | 'completed' | 'disabled';

interface BaseReminder extends Auditable {
  id: string;
  title: string;
  message: string;
  domain: ReminderDomain;
  scheduleType: ScheduleType;
  scheduledAt: ISODateString;
  recurrence: ReminderRecurrence;
  lastTriggeredAt?: ISODateString;
  smartRules?: RequireAtLeastOne<{
    /** Must be a positive integer */
    triggerOnInactivityHours: number;
    triggerOnStreakAtRisk: boolean;
    triggerOnGoalBehind: boolean;
  }>;
  metadata?: {
    type: 'system' | 'custom' | 'goal' | 'task';
    source?: string;
    [key: string]: any;
  };
}

export type Reminder = 
  | (BaseReminder & { status: 'active';    enabled: true;  completed: false; snoozedUntil?: never })
  | (BaseReminder & { status: 'snoozed';   enabled: true;  completed: false; snoozedUntil: ISODateString })
  | (BaseReminder & { status: 'completed'; enabled: false; completed: true;  snoozedUntil?: never })
  | (BaseReminder & { status: 'disabled';  enabled: false; completed: false; snoozedUntil?: never });

export interface AppNotification extends Auditable {
  id: string;
  title: string;
  message: string;
  category: 'reminders' | 'streak' | 'achievements' | 'focus' | 'productivity' | 'goals';
  timestamp: ISODateString;
  read: boolean;
  actionUrl?: AppRoute;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: ISODateString;
  metadata?: 
    | { type: 'streak'; count: number; streakType: 'reading' | 'coding' | 'focus' }
    | { type: 'achievement'; id: string }
    | { type: 'session'; duration: number; mode: string }
    | { type: 'goal'; id: string; progress: number }
    | { type: 'system'; source: string; reminderId?: string };
}

export interface ReminderSettings {
  quietHours: {
    enabled: boolean;
    start: HHMMString;
    end: HHMMString;
    /** Explicitly marks if the range spans across midnight (e.g., 22:00 to 07:00) */
    crossesMidnight: boolean;
  };
  muteWeekends: boolean;
  muteDuringFocus: boolean;
  soundEnabled: boolean;
  smartRemindersEnabled: boolean;
  browserNotificationsEnabled: boolean;
}
