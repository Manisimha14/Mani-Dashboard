import { useQuery, useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store/useAppStore';
import * as ActivitySvc from '../services/activity.service';
import type { DailyActivity } from '../types';

export const activityKeys = {
  all: (uid: string) => ['daily-activity', uid] as const,
};

export function useDailyActivity() {
  const { user } = useAuth();
  const localStore = useAppStore();

  return useQuery({
    queryKey: activityKeys.all(user?.id ?? 'local'),
    queryFn: () => user
      ? ActivitySvc.fetchDailyActivities(user.id)
      : Promise.resolve(localStore.dailyActivity),
  });
}

export function useUpsertDailyActivity(): UseMutationResult<void, Error, DailyActivity> {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async (act) => {
      if (!user) return;
      return ActivitySvc.upsertDailyActivity(user.id, act);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: activityKeys.all(user?.id ?? 'local') });
    },
  });
}

