export type TrackerType = 'progress' | 'habit' | 'quantity' | 'time' | 'checklist' | 'custom';

export interface TrackerItem {
  id: string;
  title: string;
  status: 'completed' | 'not_started' | 'skipped';
  dateCompleted?: string;
  value?: number;
  notes?: string;
  meta?: Record<string, any>;
}

export interface Tracker {
  id: string;
  title: string;
  description?: string;
  icon: string;
  color: string;
  type: TrackerType;
  category?: string;
  target?: number;
  unit?: string;
  items: TrackerItem[];
  createdAt: string;
  metadata?: {
    frequency?: 'daily' | 'weekly';
    milestones?: string[];
    isPrivate?: boolean;
    reminderEnabled?: boolean;
    reminderTime?: string;
    customFields?: { name: string; type: string }[];
  };
}
