import { useQuery, useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store/useAppStore';
import * as FocusSvc from '../services/focus.service';
import * as ActivitySvc from '../services/activity.service';
import { todayString, getProductivityScore } from '../lib/utils';
import type { FocusSession, DailyActivity } from '../types';
import { activityKeys } from './useActivityQuery';

export const focusKeys = {
  all: (uid: string) => ['focus', uid] as const,
};

export function useFocusSessions() {
  const { user } = useAuth();
  const focusSessions = useAppStore(s => s.focusSessions);

  return useQuery({
    queryKey: focusKeys.all(user?.id ?? 'local'),
    queryFn: () => user
      ? FocusSvc.fetchFocusSessions(user.id)
      : Promise.resolve(focusSessions),
  });
}

export function useAddFocusSession(): UseMutationResult<FocusSession | void, Error, Omit<FocusSession, 'id'>> {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (session): Promise<FocusSession | void> => {
      const store = useAppStore.getState();
      if (!user) {
        return store.addFocusSession(session);
      }

      const res = await FocusSvc.insertFocusSession(user.id, session);

      if (session.completed) {
        const duration = session.actualDuration || session.duration;
        
        // Award XP and dispatch notification in the local store
        store.addXp(duration * 10, 'focus', `Completed Pomodoro session: ${duration} min focused`);
        store.addNotification({
          title: 'Focus Cycle Complete',
          message: `Superb! You finished your "${session.taskName || 'Pomodoro'}" focus block. Tree planted successfully.`,
          category: 'focus',
          priority: 'normal'
        });
        store.checkAndUnlockAchievements();

        const today = todayString();
        
        let todayAct: DailyActivity = {
          date: today,
          chaptersRead: 0,
          problemsSolved: 0,
          focusMinutes: 0,
          productivityScore: 0
        };

        try {
          const activities = await ActivitySvc.fetchDailyActivities(user.id);
          const existing = activities.find(a => a.date === today);
          if (existing) {
            todayAct = { ...existing };
          }
        } catch (e) {
          console.error('Failed to fetch daily activity:', e);
        }

        todayAct.focusMinutes = Math.max(0, todayAct.focusMinutes + duration);
        todayAct.productivityScore = getProductivityScore(
          todayAct.chaptersRead,
          todayAct.problemsSolved,
          todayAct.focusMinutes
        );

        await ActivitySvc.upsertDailyActivity(user.id, todayAct);
      }

      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: focusKeys.all(user?.id ?? 'local') });
      if (user) {
        qc.invalidateQueries({ queryKey: activityKeys.all(user.id) });
      }
    },
  });
}

export function useUpdateFocusSession(): UseMutationResult<void, Error, { id: string; updates: Partial<FocusSession> }> {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const store = useAppStore.getState();
      if (!user) {
        return store.updateFocusSession(id, updates);
      }

      const currentSessions = await qc.fetchQuery<FocusSession[]>({
        queryKey: focusKeys.all(user.id),
      });
      const session = currentSessions.find(s => s.id === id);

      await FocusSvc.updateFocusSession(id, updates);

      const isCompletedNow = updates.completed === true && (!session || !session.completed);
      const isUncompletedNow = updates.completed === false && session?.completed;

      if (isCompletedNow || isUncompletedNow) {
        const today = todayString();
        const duration = updates.actualDuration || updates.duration || session?.actualDuration || session?.duration || 0;
        
        if (isCompletedNow) {
          store.addXp(duration * 10, 'focus', `Completed Pomodoro session: ${duration} min focused`);
          store.addNotification({
            title: 'Focus Cycle Complete',
            message: `Superb! You finished your "${updates.taskName || session?.taskName || 'Pomodoro'}" focus block. Tree planted successfully.`,
            category: 'focus',
            priority: 'normal'
          });
        } else {
          store.addXp(-duration * 10, 'focus', `Uncompleted Pomodoro session`);
        }
        store.checkAndUnlockAchievements();
        
        let todayAct: DailyActivity = {
          date: today,
          chaptersRead: 0,
          problemsSolved: 0,
          focusMinutes: 0,
          productivityScore: 0
        };

        try {
          const activities = await ActivitySvc.fetchDailyActivities(user.id);
          const existing = activities.find(a => a.date === today);
          if (existing) {
            todayAct = { ...existing };
          }
        } catch (e) {
          console.error('Failed to fetch daily activity:', e);
        }

        const delta = isCompletedNow ? duration : -duration;
        todayAct.focusMinutes = Math.max(0, todayAct.focusMinutes + delta);
        todayAct.productivityScore = getProductivityScore(
          todayAct.chaptersRead,
          todayAct.problemsSolved,
          todayAct.focusMinutes
        );

        await ActivitySvc.upsertDailyActivity(user.id, todayAct);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: focusKeys.all(user?.id ?? 'local') });
      if (user) {
        qc.invalidateQueries({ queryKey: activityKeys.all(user.id) });
      }
    },
  });
}
