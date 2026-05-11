import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Book, LeetCodeProblem, FocusSession, Achievement,
  PomodoroSettings, UserSettings, StreakData, DailyActivity,
  Tracker, TrackerItem
} from '../types';
import type { Reminder, AppNotification, ReminderSettings } from '../types/reminder';
import { DEFAULT_ACHIEVEMENTS, BOOK_CHAPTERS } from '../lib/data';
import { todayString, calculateStreak, generateId } from '../lib/utils';
import { format } from 'date-fns';

interface AppStore {
  // State
  book: Book;
  problems: LeetCodeProblem[];
  focusSessions: FocusSession[];
  achievements: Achievement[];
  readingStreak: StreakData;
  codingStreak: StreakData;
  focusStreak: StreakData;
  pomodoroSettings: PomodoroSettings;
  userSettings: UserSettings;
  dailyActivity: DailyActivity[];
  trackers: Tracker[];

  // Tracker actions
  addTracker: (tracker: Omit<Tracker, 'id' | 'createdAt'>) => void;
  updateTracker: (id: string, updates: Partial<Tracker>) => void;
  deleteTracker: (id: string) => void;
  addTrackerItem: (trackerId: string, item: Omit<TrackerItem, 'id'>) => void;
  updateTrackerItem: (trackerId: string, itemId: string, updates: Partial<TrackerItem>) => void;
  deleteTrackerItem: (trackerId: string, itemId: string) => void;

  // Book actions
  updateChapter: (chapterId: number, updates: Partial<Book['chapters'][0]>) => void;
  setBookMeta: (meta: Partial<Pick<Book, 'title' | 'author' | 'targetEndDate' | 'coverColor'>>) => void;

  // LeetCode actions
  addProblem: (problem: Omit<LeetCodeProblem, 'id'>) => void;
  updateProblem: (id: string, updates: Partial<LeetCodeProblem>) => void;
  deleteProblem: (id: string) => void;
  toggleProblem: (id: string) => void;

  // Focus actions
  addFocusSession: (session: Omit<FocusSession, 'id'>) => void;
  updateFocusSession: (id: string, updates: Partial<FocusSession>) => void;

  // Settings
  updatePomodoroSettings: (settings: Partial<PomodoroSettings>) => void;
  updateUserSettings: (settings: Partial<UserSettings>) => void;

  // Achievements
  checkAndUnlockAchievements: () => Achievement[];

  // Data management
  exportData: () => object;
  importData: (data: unknown) => void;
  resetData: () => void;

  // Activity
  logActivity: (type: 'reading' | 'coding' | 'focus', value: number) => void;

  // Reminders & Notifications
  reminders: Reminder[];
  notifications: AppNotification[];
  reminderSettings: ReminderSettings;
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateReminder: (id: string, updates: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  // Undo support
  lastAction: { type: string; data: any; rollback: () => void } | null;
  undoLastAction: () => void;
}

const DEFAULT_BOOK: Book = {
  id: 'main-book',
  title: 'My Book',
  author: 'Author',
  chapters: BOOK_CHAPTERS,
  startDate: todayString(),
  coverColor: '#7c3aed',
};

const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  history: {},
};

const DEFAULT_POMODORO: PomodoroSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreaks: false,
  growthTheme: 'tree',
  ambience: 'none',
  ambienceVolume: 0.5,
  soundEnabled: true,
};

const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'dark_pro',
  accentColor: '#8b5cf6',
  mood: 'focused',
  animationIntensity: 'full',
  reducedMotion: false,
  compactMode: false,
  onboardingComplete: false,
  dashboardLayout: ['stats', 'focus', 'reading', 'coding', 'achievements'],
  petType: 'owl',
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      book: DEFAULT_BOOK,
      problems: [],
      focusSessions: [],
      achievements: DEFAULT_ACHIEVEMENTS,
      readingStreak: DEFAULT_STREAK,
      codingStreak: DEFAULT_STREAK,
      focusStreak: DEFAULT_STREAK,
      pomodoroSettings: DEFAULT_POMODORO,
      userSettings: DEFAULT_USER_SETTINGS,
      dailyActivity: [],
      lastAction: null,
      reminders: [],
      notifications: [],
      reminderSettings: {
        quietHours: { enabled: false, start: '22:00', end: '07:00' },
        muteWeekends: false,
        muteDuringFocus: true,
        soundEnabled: true,
        smartRemindersEnabled: true,
        browserNotificationsEnabled: true,
      },
      trackers: [
        {
          id: 'default-reading',
          title: 'Reading',
          icon: '📚',
          color: '#8b5cf6',
          type: 'progress',
          target: 51,
          unit: 'chapters',
          items: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'default-coding',
          title: 'Daily Coding',
          icon: '💻',
          color: '#06b6d4',
          type: 'progress',
          target: 1,
          unit: 'session',
          items: [],
          createdAt: new Date().toISOString()
        },
        {
          id: 'default-gym',
          title: 'Gym Sessions',
          icon: '🏋️',
          color: '#ef4444',
          type: 'habit',
          items: [],
          createdAt: new Date().toISOString()
        }
      ],

      addTracker: (tracker) => {
        set(state => ({
          trackers: [...state.trackers, { ...tracker, id: generateId(), createdAt: new Date().toISOString() }]
        }));
      },
      updateTracker: (id, updates) => {
        set(state => ({
          trackers: state.trackers.map(t => t.id === id ? { ...t, ...updates } : t)
        }));
      },
      deleteTracker: (id) => {
        set(state => ({
          trackers: state.trackers.filter(t => t.id !== id)
        }));
      },
      addTrackerItem: (trackerId, item) => {
        set(state => ({
          trackers: state.trackers.map(t => t.id === trackerId ? {
            ...t,
            items: [...t.items, { ...item, id: generateId() }]
          } : t)
        }));
      },
      updateTrackerItem: (trackerId, itemId, updates) => {
        set(state => ({
          trackers: state.trackers.map(t => t.id === trackerId ? {
            ...t,
            items: t.items.map(i => i.id === itemId ? { ...i, ...updates } : i)
          } : t)
        }));
      },
      deleteTrackerItem: (trackerId, itemId) => {
        set(state => ({
          trackers: state.trackers.map(t => t.id === trackerId ? {
            ...t,
            items: t.items.filter(i => i.id !== itemId)
          } : t)
        }));
      },

      updateChapter: (chapterId, updates) => {
        set(state => {
          const chapters = state.book.chapters.map(ch =>
            ch.id === chapterId
              ? {
                  ...ch,
                  ...updates,
                  dateCompleted: updates.completed && !ch.completed ? todayString() : ch.dateCompleted,
                }
              : ch
          );

          // Update reading streak if completing a chapter today
          let readingStreak = state.readingStreak;
          if (updates.completed) {
            const history = { ...readingStreak.history, [todayString()]: true };
            const { current, longest } = calculateStreak(history);
            readingStreak = {
              currentStreak: current,
              longestStreak: Math.max(longest, state.readingStreak.longestStreak),
              lastActivityDate: todayString(),
              history,
            };
          }

          return {
            book: { ...state.book, chapters },
            readingStreak,
          };
        });

        get().logActivity('reading', 1);
        get().checkAndUnlockAchievements();
      },

      setBookMeta: (meta) => {
        set(state => ({ book: { ...state.book, ...meta } }));
      },

      addProblem: (problem) => {
        const newProblem = { ...problem, id: generateId() };
        set(state => {
          // Update coding streak
          let codingStreak = state.codingStreak;
          if (problem.completed) {
            const history = { ...codingStreak.history, [todayString()]: true };
            const { current, longest } = calculateStreak(history);
            codingStreak = {
              currentStreak: current,
              longestStreak: Math.max(longest, state.codingStreak.longestStreak),
              lastActivityDate: todayString(),
              history,
            };
          }
          return {
            problems: [newProblem, ...state.problems],
            codingStreak,
          };
        });
        get().logActivity('coding', 1);
        get().checkAndUnlockAchievements();
      },

      updateProblem: (id, updates) => {
        set(state => ({
          problems: state.problems.map(p => p.id === id ? { ...p, ...updates } : p),
        }));
        get().checkAndUnlockAchievements();
      },

      deleteProblem: (id) => {
        const problem = get().problems.find(p => p.id === id);
        if (!problem) return;
        
        // Save for undo
        const previousProblems = get().problems;
        const previousActivity = get().dailyActivity;

        set(state => ({ 
          problems: state.problems.filter(p => p.id !== id),
          lastAction: { 
            type: 'delete_problem', 
            data: problem, 
            rollback: () => set({ problems: previousProblems, dailyActivity: previousActivity }) 
          }
        }));

        // If it was solved today, decrement today's count
        if (problem.completed) {
          get().logActivity('coding', -1);
        }
      },

      undoLastAction: () => {
        const { lastAction } = get();
        if (lastAction?.rollback) {
          lastAction.rollback();
          set({ lastAction: null });
        }
      },

      toggleProblem: (id) => {
        const problem = get().problems.find(p => p.id === id);
        if (!problem) return;
        get().updateProblem(id, {
          completed: !problem.completed,
          status: !problem.completed ? 'solved' : 'attempted',
        });
        if (!problem.completed) {
          get().logActivity('coding', 1);
          set(state => {
            const history = { ...state.codingStreak.history, [todayString()]: true };
            const { current, longest } = calculateStreak(history);
            return {
              codingStreak: {
                currentStreak: current,
                longestStreak: Math.max(longest, state.codingStreak.longestStreak),
                lastActivityDate: todayString(),
                history,
              },
            };
          });
        }
        get().checkAndUnlockAchievements();
      },

      addFocusSession: (session) => {
        const newSession = { ...session, id: generateId() };
        set(state => {
          let focusStreak = state.focusStreak;
          if (session.completed) {
            const history = { ...focusStreak.history, [todayString()]: true };
            const { current, longest } = calculateStreak(history);
            focusStreak = {
              currentStreak: current,
              longestStreak: Math.max(longest, state.focusStreak.longestStreak),
              lastActivityDate: todayString(),
              history,
            };
          }
          return {
            focusSessions: [newSession, ...state.focusSessions],
            focusStreak,
          };
        });
        if (session.completed && session.actualDuration) {
          get().logActivity('focus', session.actualDuration);
        }
        get().checkAndUnlockAchievements();
      },

      updateFocusSession: (id, updates) => {
        set(state => ({
          focusSessions: state.focusSessions.map(s => s.id === id ? { ...s, ...updates } : s),
        }));
      },

      updatePomodoroSettings: (settings) => {
        set(state => ({ pomodoroSettings: { ...state.pomodoroSettings, ...settings } }));
      },

      updateUserSettings: (settings) => {
        set(state => ({ userSettings: { ...state.userSettings, ...settings } }));
      },

      checkAndUnlockAchievements: () => {
        const state = get();
        const { book, problems, focusSessions, readingStreak, codingStreak, focusStreak } = state;

        const completedChapters = book.chapters.filter(c => c.completed).length;
        const solvedProblems = problems.filter(p => p.completed).length;
        const hardProblems = problems.filter(p => p.completed && p.difficulty === 'Hard').length;
        const completedSessions = focusSessions.filter(s => s.completed).length;
        const totalFocusMinutes = focusSessions.filter(s => s.completed).reduce((acc, s) => acc + (s.actualDuration || s.duration), 0);

        const newlyUnlocked: Achievement[] = [];

        const achievements = state.achievements.map(ach => {
          if (ach.unlocked) return ach;

          let progress = ach.progress || 0;
          let unlocked = false;

          switch (ach.id) {
            case 'first_chapter': progress = completedChapters; unlocked = completedChapters >= 1; break;
            case 'halfway_reader': progress = completedChapters; unlocked = completedChapters >= 25; break;
            case 'bookworm': progress = completedChapters; unlocked = completedChapters >= 51; break;
            case 'reading_streak_7': progress = readingStreak.currentStreak; unlocked = readingStreak.currentStreak >= 7; break;
            case 'first_solve': progress = solvedProblems; unlocked = solvedProblems >= 1; break;
            case 'ten_problems': progress = solvedProblems; unlocked = solvedProblems >= 10; break;
            case 'fifty_problems': progress = solvedProblems; unlocked = solvedProblems >= 50; break;
            case 'hard_solver': progress = hardProblems; unlocked = hardProblems >= 10; break;
            case 'sapling_starter': progress = completedSessions; unlocked = completedSessions >= 1; break;
            case 'deep_work_monk': progress = completedSessions; unlocked = completedSessions >= 25; break;
            case 'forest_guardian': progress = completedSessions; unlocked = completedSessions >= 100; break;
            case 'focus_machine': progress = totalFocusMinutes; unlocked = totalFocusMinutes >= 3000; break;
            case 'zen_master': progress = focusStreak.currentStreak; unlocked = focusStreak.currentStreak >= 30; break;
            case 'hundred_hour_club': progress = totalFocusMinutes; unlocked = totalFocusMinutes >= 6000; break;
            case 'coding_streak_7': progress = codingStreak.currentStreak; unlocked = codingStreak.currentStreak >= 7; break;
            case 'coding_streak_30': progress = codingStreak.currentStreak; unlocked = codingStreak.currentStreak >= 30; break;
          }

          if (unlocked && !ach.unlocked) {
            newlyUnlocked.push({ ...ach, unlocked: true, unlockedAt: todayString(), progress });
            return { ...ach, unlocked: true, unlockedAt: todayString(), progress };
          }

          return { ...ach, progress };
        });

        set({ achievements });
        return newlyUnlocked;
      },

      logActivity: (type, value) => {
        const today = todayString();
        set(state => {
          const existing = state.dailyActivity.find(a => a.date === today);
          if (existing) {
            return {
              dailyActivity: state.dailyActivity.map(a =>
                a.date === today
                  ? {
                      ...a,
                      chaptersRead: type === 'reading' ? a.chaptersRead + value : a.chaptersRead,
                      problemsSolved: type === 'coding' ? a.problemsSolved + value : a.problemsSolved,
                      focusMinutes: type === 'focus' ? a.focusMinutes + value : a.focusMinutes,
                    }
                  : a
              ),
            };
          } else {
            return {
              dailyActivity: [
                ...state.dailyActivity,
                {
                  date: today,
                  chaptersRead: type === 'reading' ? value : 0,
                  problemsSolved: type === 'coding' ? value : 0,
                  focusMinutes: type === 'focus' ? value : 0,
                  productivityScore: 0,
                },
              ],
            };
          }
        });
      },

      addReminder: (reminder) => {
        set(state => ({
          reminders: [
            ...state.reminders,
            { 
              ...reminder, 
              id: generateId(), 
              createdAt: new Date().toISOString(), 
              updatedAt: new Date().toISOString() 
            }
          ]
        }));
      },
      updateReminder: (id, updates) => {
        set(state => ({
          reminders: state.reminders.map(r => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r)
        }));
      },
      deleteReminder: (id) => {
        set(state => ({
          reminders: state.reminders.filter(r => r.id !== id)
        }));
      },
      addNotification: (notification) => {
        set(state => ({
          notifications: [
            { 
              ...notification, 
              id: generateId(), 
              timestamp: new Date().toISOString(), 
              read: false 
            },
            ...state.notifications 
          ].slice(0, 100) // Keep last 100
        }));
      },
      markNotificationRead: (id) => {
        set(state => ({
          notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
        }));
      },
      clearNotifications: () => {
        set({ notifications: [] });
      },

      exportData: () => {
        const state = get();
        return {
          version: 1,
          exportDate: new Date().toISOString(),
          book: state.book,
          problems: state.problems,
          focusSessions: state.focusSessions,
          achievements: state.achievements,
          readingStreak: state.readingStreak,
          codingStreak: state.codingStreak,
          focusStreak: state.focusStreak,
          pomodoroSettings: state.pomodoroSettings,
          userSettings: state.userSettings,
          dailyActivity: state.dailyActivity,
          trackers: state.trackers,
        };
      },

      importData: (data: unknown) => {
        const d = data as Record<string, unknown>;
        if (!d || typeof d !== 'object') throw new Error('Invalid data');
        set({
          book: (d.book as Book) || DEFAULT_BOOK,
          problems: (d.problems as LeetCodeProblem[]) || [],
          focusSessions: (d.focusSessions as FocusSession[]) || [],
          achievements: (d.achievements as Achievement[]) || DEFAULT_ACHIEVEMENTS,
          readingStreak: (d.readingStreak as StreakData) || DEFAULT_STREAK,
          codingStreak: (d.codingStreak as StreakData) || DEFAULT_STREAK,
          focusStreak: (d.focusStreak as StreakData) || DEFAULT_STREAK,
          pomodoroSettings: (d.pomodoroSettings as PomodoroSettings) || DEFAULT_POMODORO,
          userSettings: (d.userSettings as UserSettings) || DEFAULT_USER_SETTINGS,
          dailyActivity: (d.dailyActivity as DailyActivity[]) || [],
          trackers: (d.trackers as Tracker[]) || [],
        });
      },

      resetData: () => {
        set({
          book: DEFAULT_BOOK,
          problems: [],
          focusSessions: [],
          achievements: DEFAULT_ACHIEVEMENTS,
          readingStreak: DEFAULT_STREAK,
          codingStreak: DEFAULT_STREAK,
          focusStreak: DEFAULT_STREAK,
          dailyActivity: [],
          trackers: [],
        });
      },
    }),
    {
      name: 'dashboard-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
