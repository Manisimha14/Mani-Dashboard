import { useAppStore } from '../store/useAppStore';
import { queryClient } from '../components/AppQueryProvider';
import { soundEngine } from '../hooks/useSoundFX';
import { supabase } from '../lib/supabase';
import * as FocusSvc from '../services/focus.service';
import * as ActivitySvc from '../services/activity.service';
import { todayString, getProductivityScore, generateId } from '../lib/utils';
import type { FocusSession, DailyActivity } from '../types';
import toast from 'react-hot-toast';

let intervalId: number | null = null;

// Audio notification fallback helper
function playAudioNotificationFallback() {
  try {
    const audio = new Audio('/complete.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Fallback to sound engine
      soundEngine.success(0.4);
    });
  } catch (e) {
    soundEngine.success(0.4);
  }
}

// Request and verify browser notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

// Trigger standard push/toast notifications
export function triggerNotification(title: string, body: string) {
  if (typeof window === 'undefined') return;

  const store = useAppStore.getState();
  store.addNotification({
    title,
    message: body,
    category: 'focus',
    priority: 'high',
  });

  // Native push if permitted
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        tag: 'focus-timer-session',
      });
    } catch (e) {
      console.warn("Failed to trigger native notification, falling back to service worker...", e);
    }
  } else {
    // Elegant fallback toast
    toast.success(`${title}: ${body}`, { duration: 5000 });
  }

  // Fallback sound trigger
  playAudioNotificationFallback();
}

/**
 * Singleton Focus Timer Service
 * Offloads timer intervals from unmounting React components to maintain background
 * session logging, tab switches resilience, and high-performance visibility throttles.
 */
export const focusTimerService = {
  startEngine() {
    if (intervalId) return;

    intervalId = setInterval(() => {
      this.tick();
    }, 1000) as any;
  },

  stopEngine() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  },

  tick() {
    const store = useAppStore.getState();
    const { isRunning, endTime, mode, timeLeft } = store.focusTimer;

    if (!isRunning || !endTime) return;

    const now = Date.now();
    const isOver = now >= endTime;

    if (isOver) {
      this.handleComplete();
      return;
    }

    // Tab Visibility Optimization:
    // Only update Zustand timeLeft and growthProgress if tab is active/visible
    // This prevents hundreds of wasteful rerenders in background tabs
    const isVisible = typeof document !== 'undefined' ? document.visibilityState === 'visible' : true;
    const currentRemaining = Math.max(0, Math.round((endTime - now) / 1000));

    if (isVisible) {
      const pomodoroSettings = store.pomodoroSettings;
      const totalDurationSec = (mode === 'focus' ? pomodoroSettings.focusDuration :
                               mode === 'short_break' ? pomodoroSettings.shortBreakDuration :
                               pomodoroSettings.longBreakDuration) * 60;
      
      const elapsed = totalDurationSec - currentRemaining;
      const growthProgress = totalDurationSec > 0 ? (elapsed / totalDurationSec) * 100 : 0;

      store.setFocusTimerState({
        timeLeft: currentRemaining,
        growthProgress,
      });

      // Subtle ticking audio indicator
      if (currentRemaining > 0 && currentRemaining % 60 === 0) {
        soundEngine.tick(0.08);
      }
    } else {
      // In background: Just update timeLeft state once in a while or silently
      if (timeLeft !== currentRemaining) {
        store.setFocusTimerState({ timeLeft: currentRemaining });
      }
    }
  },

  async handleComplete() {
    this.stopEngine();
    
    const store = useAppStore.getState();
    const pomodoroSettings = store.pomodoroSettings;
    const { mode, currentSession, sessionCount, mood } = store.focusTimer;

    // Reset running states
    store.setFocusTimerState({
      isRunning: false,
      endTime: null,
      timeLeft: 0,
      growthProgress: 0,
    });

    if (mode === 'focus') {
      const duration = pomodoroSettings.focusDuration;
      const score = Math.min(100, Math.round((duration / 25) * 80 + (mood === 'energetic' ? 20 : mood === 'motivated' ? 15 : 10)));
      
      const finishedSession: Omit<FocusSession, 'id'> = {
        ...currentSession,
        endTime: new Date().toISOString(),
        actualDuration: duration,
        completed: true,
        failed: false,
        mood,
        productivityScore: score,
        reflection: '',
      } as any;

      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;

        if (userId) {
          // Log directly to Supabase since component may be unmounted!
          await FocusSvc.insertFocusSession(userId, finishedSession);
          
          // Log XP & XP Ledger entries
          store.addXp(duration * 10, 'focus', `Completed Pomodoro session: ${duration} min focused`);
          store.checkAndUnlockAchievements();

          // Sync local state as fallback
          store.setFocusTimerState({
            currentSession: null,
            sessionCount: sessionCount + 1,
            sessionFailed: false,
          });

          // Invalidate React Query keys safely
          queryClient.invalidateQueries({ queryKey: ['focus', userId] });
          queryClient.invalidateQueries({ queryKey: ['activity', userId] });

          // Update daily activity logs
          const today = todayString();
          let todayAct: DailyActivity = {
            date: today,
            chaptersRead: 0,
            problemsSolved: 0,
            focusMinutes: 0,
            productivityScore: 0
          };

          try {
            const activities = await ActivitySvc.fetchDailyActivities(userId);
            const existing = activities.find(a => a.date === today);
            if (existing) todayAct = { ...existing };
          } catch (e) {
            console.error('Failed to sync background activity logs:', e);
          }

          todayAct.focusMinutes = Math.max(0, todayAct.focusMinutes + duration);
          todayAct.productivityScore = getProductivityScore(
            todayAct.chaptersRead,
            todayAct.problemsSolved,
            todayAct.focusMinutes
          );

          await ActivitySvc.upsertDailyActivity(userId, todayAct);

        } else {
          // Local/Offline Mode Fallback
          store.addFocusSession(finishedSession);
        }
      } catch (err) {
        console.error("Failed to complete focus session in background:", err);
        // Fallback local save
        store.addFocusSession(finishedSession);
      }

      // Show native/toast notification
      triggerNotification('🎉 Focus Cycle Complete!', 'Spectacular! Your tree has fully grown.');

      // Toggle modes
      const shouldLong = (sessionCount + 1) % pomodoroSettings.sessionsBeforeLongBreak === 0;
      const nextMode = shouldLong ? 'long_break' : 'short_break';
      const breakDuration = (nextMode === 'long_break' ? pomodoroSettings.longBreakDuration : pomodoroSettings.shortBreakDuration) * 60;

      store.setFocusTimerState({
        mode: nextMode,
        timeLeft: breakDuration,
        currentSession: null,
        sessionCount: sessionCount + 1,
      });

    } else {
      // Break completion
      triggerNotification('Break Over! ☕', 'Your break has finished. Ready to focus again?');

      const nextDuration = pomodoroSettings.focusDuration * 60;
      store.setFocusTimerState({
        mode: 'focus',
        timeLeft: nextDuration,
        sessionFailed: false,
      });
    }

    // Play final sound notification
    soundEngine.sessionEnd(0.5);
  },

  async handleGiveUp() {
    this.stopEngine();
    
    const store = useAppStore.getState();
    const { currentSession, mode } = store.focusTimer;
    
    if (!currentSession || mode !== 'focus') return;

    store.setFocusTimerState({
      isRunning: false,
      endTime: null,
      growthProgress: 0,
      sessionFailed: true,
      currentSession: null,
    });

    const elapsedMs = Date.now() - (currentSession.startTime ? new Date(currentSession.startTime).getTime() : Date.now());
    const actual = Math.max(0, Math.round(elapsedMs / 60000));

    const failedSession: Omit<FocusSession, 'id'> = {
      ...currentSession,
      endTime: new Date().toISOString(),
      actualDuration: actual,
      completed: false,
      failed: true,
    } as any;

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (userId) {
        await FocusSvc.insertFocusSession(userId, failedSession);
        queryClient.invalidateQueries({ queryKey: ['focus', userId] });
      } else {
        store.addFocusSession(failedSession);
      }
    } catch (err) {
      store.addFocusSession(failedSession);
    }

    soundEngine.error(0.3);
    toast.error('Session ended early. Your tree withered 🍂');
    
    const nextDuration = store.pomodoroSettings.focusDuration * 60;
    store.setFocusTimerState({ timeLeft: nextDuration });
  }
};
