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
  const localStore = useAppStore();

  return useQuery({
    queryKey: achievementKeys.all(user?.id ?? 'local'),
    queryFn: () => user
      ? AchievementSvc.fetchAchievements(user.id)
      : Promise.resolve(localStore.achievements),
  });
}

export function useUpdateAchievement(): UseMutationResult<
  void,
  Error,
  { id: string; updates: Partial<Pick<Achievement, 'unlocked' | 'unlockedAt' | 'progress'>> }
> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useAppStore();

  return useMutation({
    mutationFn: async ({ id, updates }) => {
      if (!user) {
        localStore.updateAchievement(id, updates);
        return;
      }
      return AchievementSvc.updateAchievement(user.id, id, updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: achievementKeys.all(user?.id ?? 'local') });
    },
  });
}

