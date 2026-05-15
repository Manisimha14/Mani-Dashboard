import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Book, LeetCodeProblem, FocusSession, Achievement,
  PomodoroSettings, UserSettings, StreakData, DailyActivity,
  Tracker, TrackerItem, LeetCodeStatus,
  AppLink, LauncherState
} from '../types';
import type { Reminder, AppNotification, ReminderSettings, ISODateString, HHMMString } from '../types/reminder';
import { DEFAULT_ACHIEVEMENTS, BOOK_CHAPTERS } from '../lib/data';
import { todayString, calculateStreak, generateId, updateStreakData } from '../lib/utils';
import { showAchievementToast } from '../lib/toasts';

type UndoAction =
  | { type: 'delete_problem'; data: LeetCodeProblem; rollback: () => void }
  | { type: 'delete_tracker'; data: Tracker; rollback: () => void }
  | { type: 'delete_session'; data: FocusSession; rollback: () => void }
  | { type: 'complete_chapter'; data: { id: number; prevStatus: string; prevCompleted: boolean }; rollback: () => void };

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
  addTracker: (tracker: Omit<Tracker, 'id' | 'createdAt'> & { id?: string }) => void;
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

  // Launcher actions
  launcher: LauncherState;
  addAppLink: (link: Omit<AppLink, 'id' | 'visitCount' | 'isPinned' | 'createdAt' | 'updatedAt'>) => void;
  updateAppLink: (id: string, updates: Partial<AppLink>) => void;
  deleteAppLink: (id: string) => void;
  recordAppVisit: (id: string) => void;
  toggleAppPin: (id: string) => void;
  updateLauncher: (updates: Partial<LauncherState>) => void;

  // Undo support
  lastAction: UndoAction | null;
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
  keyboardShortcuts: true,
};

const DEFAULT_APP_LINKS: AppLink[] = [
  { id: '1', name: 'GitHub', url: 'https://github.com', iconType: 'lucide', iconValue: 'LayoutGrid', category: 'development', visitCount: 0, isPinned: true, color: '#2dba4e', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', name: 'YouTube', url: 'https://youtube.com', iconType: 'lucide', iconValue: 'Play', category: 'entertainment', visitCount: 0, isPinned: false, color: '#ff0000', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '3', name: 'ChatGPT', url: 'https://chat.openai.com', iconType: 'lucide', iconValue: 'MessageSquare', category: 'utilities', visitCount: 0, isPinned: true, color: '#10a37f', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '4', name: 'LeetCode', url: 'https://leetcode.com', iconType: 'lucide', iconValue: 'Code2', category: 'learning', visitCount: 0, isPinned: true, color: '#ffa116', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const DEFAULT_LAUNCHER_STATE: LauncherState = {
  schemaVersion: 2,
  appLinks: DEFAULT_APP_LINKS,
  searchQuery: '',
  layoutMode: 'grid',
  sortMode: 'manual',
  showPinnedOnly: false,
  launcherOpen: false,
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
        quietHours: { enabled: false, start: '22:00' as HHMMString, end: '07:00' as HHMMString, crossesMidnight: true },
        muteWeekends: false,
        muteDuringFocus: true,
        soundEnabled: true,
        smartRemindersEnabled: true,
        browserNotificationsEnabled: true,
      },
      trackers: [],

      addTracker: (tracker) => {
        set(state => ({
          trackers: [...state.trackers, { id: generateId(), ...tracker, createdAt: new Date().toISOString() as ISODateString }]
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

      // Launcher actions
      launcher: DEFAULT_LAUNCHER_STATE,
      addAppLink: (link) => {
        set(state => ({
          launcher: {
            ...state.launcher,
            appLinks: [
              ...state.launcher.appLinks, 
              { 
                ...link, 
                id: generateId(), 
                visitCount: 0, 
                isPinned: false, 
                createdAt: new Date().toISOString(), 
                updatedAt: new Date().toISOString() 
              }
            ]
          }
        }));
      },
      updateAppLink: (id, updates) => {
        set(state => ({
          launcher: {
            ...state.launcher,
            appLinks: state.launcher.appLinks.map(l => l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l)
          }
        }));
      },
      deleteAppLink: (id) => {
        set(state => ({
          launcher: {
            ...state.launcher,
            appLinks: state.launcher.appLinks.filter(l => l.id !== id)
          }
        }));
      },
      recordAppVisit: (id) => {
        set(state => ({
          launcher: {
            ...state.launcher,
            appLinks: state.launcher.appLinks.map(l => l.id === id ? { ...l, visitCount: l.visitCount + 1, lastVisited: new Date().toISOString() } : l)
          }
        }));
      },
      toggleAppPin: (id) => {
        set(state => ({
          launcher: {
            ...state.launcher,
            appLinks: state.launcher.appLinks.map(l => l.id === id ? { ...l, isPinned: !l.isPinned, updatedAt: new Date().toISOString() } : l)
          }
        }));
      },
      updateLauncher: (updates) => {
        set(state => ({
          launcher: { ...state.launcher, ...updates }
        }));
      },

      updateChapter: (chapterId, updates) => {
        set(state => {
          const chapters = state.book.chapters.map(ch =>
            ch.id === chapterId ? { ...ch, ...updates, dateCompleted: updates.completed && !ch.completed ? todayString() : ch.dateCompleted } : ch
          );

          let readingStreak = state.readingStreak;
          if (updates.completed) {
            readingStreak = updateStreakData(state.readingStreak);
          }

          return {
            book: { ...state.book, chapters },
            readingStreak
          };
        });

        if (updates.completed !== undefined) {
          get().logActivity('reading', updates.completed ? 1 : -1);
        }
        get().checkAndUnlockAchievements();
      },

      setBookMeta: (meta) => {
        set(state => ({ book: { ...state.book, ...meta } }));
      },

      addProblem: (problem) => {
        const newProblem = { ...problem, id: generateId() };
        set(state => {
          let codingStreak = state.codingStreak;
          if (problem.completed) {
            codingStreak = updateStreakData(state.codingStreak);
          }
          return {
            problems: [newProblem, ...state.problems],
            codingStreak,
          };
        });
        if (problem.completed) {
          get().logActivity('coding', 1);
        }
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
        
        const isCompleting = !problem.completed;
        
        set(state => {
          const problems = state.problems.map(p =>
            p.id === id ? { ...p, completed: isCompleting, status: (isCompleting ? 'solved' : 'todo') as LeetCodeStatus } : p
          );
          
          let codingStreak = state.codingStreak;
          if (isCompleting) {
            codingStreak = updateStreakData(state.codingStreak);
          }

          return { problems, codingStreak };
        });

        get().logActivity('coding', isCompleting ? 1 : -1);
        get().checkAndUnlockAchievements();
      },

      addFocusSession: (session) => {
        const newSession = { ...session, id: generateId() };
        set(state => {
          let focusStreak = state.focusStreak;
          if (session.completed) {
            focusStreak = updateStreakData(state.focusStreak);
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
          let progress = ach.progress || 0;
          let unlocked = ach.unlocked;

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

          return { ...ach, progress, unlocked };
        });

        const hasChanges = achievements.some((a, i) => a.progress !== state.achievements[i].progress || a.unlocked !== state.achievements[i].unlocked);
        
        if (hasChanges) {
          set({ achievements });
        }

        if (newlyUnlocked.length > 0) {
          newlyUnlocked.forEach(ach => {
            showAchievementToast(ach.title, ach.icon);
          });
        }
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
                      chaptersRead: type === 'reading' ? Math.max(0, a.chaptersRead + value) : a.chaptersRead,
                      problemsSolved: type === 'coding' ? Math.max(0, a.problemsSolved + value) : a.problemsSolved,
                      focusMinutes: type === 'focus' ? Math.max(0, a.focusMinutes + value) : a.focusMinutes,
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
                  chaptersRead: type === 'reading' ? Math.max(0, value) : 0,
                  problemsSolved: type === 'coding' ? Math.max(0, value) : 0,
                  focusMinutes: type === 'focus' ? Math.max(0, value) : 0,
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
              createdAt: new Date().toISOString() as ISODateString, 
              updatedAt: new Date().toISOString() as ISODateString 
            }
          ] as Reminder[]
        }));
      },
      updateReminder: (id, updates) => {
        set(state => ({
          reminders: state.reminders.map(r => r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() as ISODateString } : r) as Reminder[]
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
              timestamp: new Date().toISOString() as ISODateString, 
              createdAt: new Date().toISOString() as ISODateString,
              updatedAt: new Date().toISOString() as ISODateString,
              read: false 
            } as AppNotification,
            ...state.notifications 
          ].slice(0, 100)
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
          reminders: state.reminders,
          notifications: state.notifications,
          reminderSettings: state.reminderSettings,
          launcher: state.launcher
        };
      },

      importData: (data: unknown) => {
        const d = data as any;
        if (!d || typeof d !== 'object' || d.version !== 1) {
          throw new Error('Invalid or incompatible export file version');
        }
        
        // Basic shape validation
        if (!d.book || !Array.isArray(d.book.chapters) || !Array.isArray(d.problems)) {
          throw new Error('Export file is corrupted or missing required fields');
        }

        set({
          book: d.book || DEFAULT_BOOK,
          problems: d.problems || [],
          focusSessions: d.focusSessions || [],
          achievements: d.achievements || DEFAULT_ACHIEVEMENTS,
          readingStreak: d.readingStreak || DEFAULT_STREAK,
          codingStreak: d.codingStreak || DEFAULT_STREAK,
          focusStreak: d.focusStreak || DEFAULT_STREAK,
          pomodoroSettings: d.pomodoroSettings || DEFAULT_POMODORO,
          userSettings: d.userSettings || DEFAULT_USER_SETTINGS,
          dailyActivity: d.dailyActivity || [],
          trackers: d.trackers || [],
          reminders: d.reminders || [],
          notifications: d.notifications || [],
          reminderSettings: d.reminderSettings || get().reminderSettings,
          launcher: d.launcher || DEFAULT_LAUNCHER_STATE
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
          reminders: [],
          notifications: [],
          pomodoroSettings: DEFAULT_POMODORO,
          userSettings: DEFAULT_USER_SETTINGS,
          launcher: DEFAULT_LAUNCHER_STATE
        });
      },
    }),
    {
      name: 'dashboard-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        const { lastAction, ...rest } = state;
        return rest;
      }
    }
  )
);
