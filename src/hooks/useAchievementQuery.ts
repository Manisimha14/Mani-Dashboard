import { useQuery, useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store/useAppStore';
import * as AchievementSvc from '../services/achievements.service';
import type { Achievement } from '../types';

export const achievementKeys = {
  all: (uid: string) => ['achievements', uid] as const,
};

export function useAchievements() {
  const { user } = useAuth();
  const achievements = useAppStore(s => s.achievements);

  return useQuery({
    queryKey: achievementKeys.all(user?.id ?? 'local'),
    queryFn: () => user
      ? AchievementSvc.fetchAchievements(user.id)
      : Promise.resolve(achievements),
  });
}

export function useUpdateAchievement(): UseMutationResult<
  void,
  Error,
  { id: string; updates: Partial<Pick<Achievement, 'unlocked' | 'unlockedAt' | 'progress'>> }
> {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const store = useAppStore.getState();
      if (!user) {
        store.updateAchievement(id, updates);
        return;
      }
      return AchievementSvc.updateAchievement(user.id, id, updates);
    },
    onSuccess: (_, variables) => {
      const qKey = achievementKeys.all(user?.id ?? 'local');
      qc.setQueryData<Achievement[]>(qKey, (old) => {
        if (!old) return old;
        return old.map(ach => ach.id === variables.id ? { ...ach, ...variables.updates } : ach);
      });
      qc.invalidateQueries({ queryKey: qKey });
    },
  });
}

