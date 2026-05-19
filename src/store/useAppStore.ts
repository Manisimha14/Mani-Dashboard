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
import { showAchievementToast, showNotificationToast } from '../lib/toasts';

type UndoAction =
  | { type: 'delete_problem'; data: LeetCodeProblem; rollback: () => void }
  | { type: 'delete_tracker'; data: Tracker; rollback: () => void }
  | { type: 'delete_session'; data: FocusSession; rollback: () => void }
  | { type: 'complete_chapter'; data: { id: number; prevStatus: string; prevCompleted: boolean }; rollback: () => void };

import type { XpLedgerEntry } from '../types';
import { encryptVaultData, decryptVaultData } from '../utils/vaultCrypto';

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
  celebratingAchievement: Achievement | null;
  lastBackupAt?: string;
  xp: number;
  level: number;
  xpLedger: XpLedgerEntry[];

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
  updateAchievement: (id: string, updates: Partial<Pick<Achievement, 'unlocked' | 'unlockedAt' | 'progress'>>) => void;

  // Data management
  exportData: () => object;
  importData: (data: unknown) => void;
  resetData: () => void;

  // Activity
  logActivity: (type: 'reading' | 'coding' | 'focus', value: number) => void;

  // XP Gamification
  addXp: (amount: number, source: string, description: string) => void;

  // Reminders & Notifications
  reminders: Reminder[];
  notifications: AppNotification[];
  reminderSettings: ReminderSettings;
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateReminder: (id: string, updates: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'createdAt' | 'updatedAt'> & Partial<Pick<AppNotification, 'createdAt' | 'updatedAt'>>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  updateReminderSettings: (settings: Partial<ReminderSettings>) => void;
  recordBackup: () => void;

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
  deletedReports: string[];
  deleteReport: (reportKey: string) => void;
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
  scratchpadNote: '',
  scratchpadTodos: '[]',
  financeTransactions: '[]',
  financeBudgetLimit: 1000,
  pwaBadgingEnabled: true,
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
      xp: 0,
      level: 1,
      xpLedger: [],
      reminders: [],
      notifications: [],
      reminderSettings: {
        quietHours: { enabled: false, start: '22:00' as HHMMString, end: '07:00' as HHMMString, crossesMidnight: true },
        muteWeekends: false,
        muteDuringFocus: true,
        soundEnabled: true,
        smartRemindersEnabled: true,
        browserNotificationsEnabled: true,
        backupReminderEnabled: true,
      },
      trackers: [],
      celebratingAchievement: null,
      deletedReports: [],

      deleteReport: (reportKey) => {
        set(state => ({
          deletedReports: [...state.deletedReports, reportKey]
        }));
      },

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
        const tracker = get().trackers.find(t => t.id === trackerId);
        set(state => ({
          trackers: state.trackers.map(t => t.id === trackerId ? {
            ...t,
            items: [...t.items, { ...item, id: generateId() }]
          } : t)
        }));
        get().addXp(50, 'tracker', `Logged item for tracker: ${tracker?.title ?? 'Custom Tracker'}`);
        get().addNotification({
          title: 'Tracker Item Logged',
          message: `Logged entry: "${item.value}" in "${tracker?.title ?? 'Custom Tracker'}". +50 XP rewarded!`,
          category: 'reminders',
          priority: 'normal'
        });
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
          const ch = get().book.chapters.find(c => c.id === chapterId);
          if (updates.completed) {
            get().addXp(200, 'reading', `Completed Chapter ${ch?.number ?? chapterId}: ${ch?.title ?? ''}`);
            get().addNotification({
              title: 'Chapter Completed!',
              message: `Great read! You finished "Chapter ${ch?.number ?? chapterId}: ${ch?.title ?? ''}". +200 XP rewarded!`,
              category: 'reminders',
              priority: 'normal'
            });
          } else {
            get().addXp(-200, 'reading', `Uncompleted Chapter ${ch?.number ?? chapterId}`);
          }
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
          get().addXp(150, 'coding', `Solved problem: ${problem.name}`);
          get().addNotification({
            title: 'LeetCode Problem Solved',
            message: `"${problem.name}" [${problem.difficulty}] logged successfully. +150 XP rewarded!`,
            category: 'streak',
            priority: 'normal'
          });
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
            p.id === id ? { 
              ...p, 
              completed: isCompleting, 
              status: (isCompleting ? 'solved' : 'todo') as LeetCodeStatus,
              date: isCompleting ? todayString() : p.date 
            } : p
          );
          
          let codingStreak = state.codingStreak;
          if (isCompleting) {
            codingStreak = updateStreakData(state.codingStreak);
          }

          return { problems, codingStreak };
        });

        get().logActivity('coding', isCompleting ? 1 : -1);
        if (isCompleting) {
          get().addXp(150, 'coding', `Solved problem: ${problem.name}`);
          get().addNotification({
            title: 'LeetCode Problem Solved',
            message: `"${problem.name}" [${problem.difficulty}] logged successfully. +150 XP rewarded!`,
            category: 'streak',
            priority: 'normal'
          });
        } else {
          get().addXp(-150, 'coding', `Unsolved problem: ${problem.name}`);
        }
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
          get().addXp(session.actualDuration * 10, 'focus', `Completed Pomodoro session: ${session.actualDuration} min focused`);
          get().addNotification({
            title: 'Focus Cycle Complete',
            message: `Superb! You finished your "${session.taskName || 'Pomodoro'}" focus block. Tree planted successfully.`,
            category: 'focus',
            priority: 'normal'
          });
        }
        get().checkAndUnlockAchievements();
      },

      updateFocusSession: (id, updates) => {
        const session = get().focusSessions.find(s => s.id === id);
        const wasCompleted = session?.completed ?? false;
        const isCompleted = updates.completed !== undefined ? updates.completed : wasCompleted;
        const duration = updates.actualDuration || updates.duration || session?.actualDuration || session?.duration || 0;

        set(state => ({
          focusSessions: state.focusSessions.map(s => s.id === id ? { ...s, ...updates } : s),
        }));

        if (isCompleted && !wasCompleted) {
          get().logActivity('focus', duration);
        } else if (!isCompleted && wasCompleted) {
          get().logActivity('focus', -duration);
        }
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
            get().addNotification({
              title: 'Achievement Unlocked!',
              message: `Spectacular! You unlocked "${ach.title}": ${ach.description} ${ach.icon}`,
              category: 'achievements',
              priority: 'normal',
              metadata: {
                type: 'achievement',
                id: ach.id
              }
            });
          });
        }
        return newlyUnlocked;
      },

      updateAchievement: (id, updates) => {
        set(state => ({
          achievements: state.achievements.map(a => a.id === id ? { ...a, ...updates } : a)
        }));
      },

      logActivity: (type, value) => {
        const today = todayString();
        set(state => {
          const existing = state.dailyActivity.find(a => a.date === today);
          let updatedList;
          if (existing) {
            updatedList = state.dailyActivity.map(a => {
              if (a.date === today) {
                const chaptersRead = type === 'reading' ? Math.max(0, a.chaptersRead + value) : a.chaptersRead;
                const problemsSolved = type === 'coding' ? Math.max(0, a.problemsSolved + value) : a.problemsSolved;
                const focusMinutes = type === 'focus' ? Math.max(0, a.focusMinutes + value) : a.focusMinutes;
                
                const readingScore = Math.min(chaptersRead * 20, 40);
                const codingScore = Math.min(problemsSolved * 30, 40);
                const focusScore = Math.min((focusMinutes / 120) * 20, 20);
                const productivityScore = Math.round(readingScore + codingScore + focusScore);
                
                return {
                  ...a,
                  chaptersRead,
                  problemsSolved,
                  focusMinutes,
                  productivityScore,
                };
              }
              return a;
            });
          } else {
            const chaptersRead = type === 'reading' ? Math.max(0, value) : 0;
            const problemsSolved = type === 'coding' ? Math.max(0, value) : 0;
            const focusMinutes = type === 'focus' ? Math.max(0, value) : 0;

            const readingScore = Math.min(chaptersRead * 20, 40);
            const codingScore = Math.min(problemsSolved * 30, 40);
            const focusScore = Math.min((focusMinutes / 120) * 20, 20);
            const productivityScore = Math.round(readingScore + codingScore + focusScore);

            updatedList = [
              ...state.dailyActivity,
              {
                date: today,
                chaptersRead,
                problemsSolved,
                focusMinutes,
                productivityScore,
              }
            ];
          }
          return { dailyActivity: updatedList };
        });
      },

      addXp: (amount, source, description) => {
        set(state => {
          const newXp = state.xp + amount;
          const newLevel = Math.floor(newXp / 1000) + 1;
          const isLevelUp = newLevel > state.level;

          const newEntry = {
            id: generateId(),
            amount,
            source,
            description,
            timestamp: new Date().toISOString(),
          };

          const updatedLedger = [newEntry, ...state.xpLedger].slice(0, 100);

          if (isLevelUp) {
            setTimeout(() => {
              showAchievementToast(`LEVEL UP! Reached Level ${newLevel}`, '🏆');
              // Auto-inject a system notification for the user
              get().addNotification({
                title: 'Operating System Level Up!',
                message: `Congratulations! You leveled up from Level ${state.level} to Level ${newLevel}! Your experience is growing exponentially.`,
                category: 'achievements',
                priority: 'normal',
                createdAt: new Date().toISOString() as ISODateString,
                updatedAt: new Date().toISOString() as ISODateString,
                metadata: {
                  type: 'achievement',
                  id: `level-${newLevel}`
                }
              });
            }, 100);
          }

          return {
            xp: newXp,
            level: newLevel,
            xpLedger: updatedLedger,
          };
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
        const id = generateId();
        const timestamp = new Date().toISOString() as ISODateString;
        const fullNotification = { 
          ...notification, 
          id, 
          timestamp, 
          createdAt: timestamp,
          updatedAt: timestamp,
          read: false 
        } as AppNotification;

        set(state => ({
          notifications: [
            fullNotification,
            ...state.notifications 
          ].slice(0, 100)
        }));

        // Sound trigger
        if (get().reminderSettings.soundEnabled) {
          import('../hooks/useSoundFX').then(({ soundEngine }) => {
            if (notification.priority === 'urgent') {
              soundEngine.error(0.4);
            } else {
              soundEngine.click(0.4);
            }
          }).catch(() => {});
        }

        // Native push notification
        if (
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted' &&
          get().reminderSettings.browserNotificationsEnabled
        ) {
          const tag = notification.metadata && 'reminderId' in notification.metadata
            ? (notification.metadata as any).reminderId
            : undefined;

          try {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then((registration) => {
                registration.showNotification(notification.title, {
                  body: notification.message,
                  icon: '/pwa-192x192.png',
                  tag: tag,
                });
              }).catch(() => {
                // Fallback
                new Notification(notification.title, { body: notification.message, icon: '/pwa-192x192.png', tag: tag });
              });
            } else {
              new Notification(notification.title, { body: notification.message, icon: '/pwa-192x192.png', tag: tag });
            }
          } catch (e) {
            console.error('Failed to show notification', e);
          }
        }

        // Toast alert with CTA callback if backup nudge
        const triggerBackupDownload = () => {
          const data = get().exportData();
          const encrypted = encryptVaultData(data);
          const blob = new Blob([encrypted], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `mani-vault-${new Date().toISOString().split('T')[0]}.mvsf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          get().recordBackup();
        };

        if (notification.metadata?.type === 'backup_nudge') {
          showNotificationToast(
            notification.title,
            notification.message,
            notification.category || 'reminders',
            notification.priority || 'normal',
            triggerBackupDownload,
            'Export Backup'
          );
        } else {
          showNotificationToast(
            notification.title,
            notification.message,
            notification.category || 'reminders',
            notification.priority || 'normal'
          );
        }
      },
      markNotificationRead: (id) => {
        set(state => ({
          notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
        }));
      },
      clearNotifications: () => {
        set({ notifications: [] });
      },
      updateReminderSettings: (settings) => {
        set(state => ({ reminderSettings: { ...state.reminderSettings, ...settings } }));
      },
      recordBackup: () => {
        set({ lastBackupAt: new Date().toISOString() });
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
          launcher: state.launcher,
          deletedReports: state.deletedReports
        };
      },

      importData: (data: unknown) => {
        let d = data as any;
        if (typeof d === 'string') {
          try {
            d = decryptVaultData(d);
          } catch (err: any) {
            throw new Error(err.message || 'Failed to decrypt vault file.');
          }
        }

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
          launcher: d.launcher || DEFAULT_LAUNCHER_STATE,
          deletedReports: d.deletedReports || []
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
          launcher: DEFAULT_LAUNCHER_STATE,
          deletedReports: []
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
