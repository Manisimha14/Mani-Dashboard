import Dexie, { type Table } from 'dexie';
import type { Chapter, LeetCodeProblem, FocusSession, Achievement, DailyActivity } from '../types';

export class DashboardDB extends Dexie {
  chapters!: Table<Chapter>;
  problems!: Table<LeetCodeProblem>;
  focusSessions!: Table<FocusSession>;
  achievements!: Table<Achievement>;
  activity!: Table<DailyActivity>;
  files!: Table<{ id: string; data: Blob; name: string; type: string }>;

  constructor() {
    super('DashboardDB');
    this.version(1).stores({
      chapters: 'id, number, status, completed, dateCompleted',
      problems: 'id, date, difficulty, topic, status, completed',
      focusSessions: 'id, date, completed, failed, mode',
      achievements: 'id, category, unlocked, rarity',
      activity: 'date',
    });
    this.version(2).stores({
      files: 'id'
    });
  }
}

export const db = new DashboardDB();
