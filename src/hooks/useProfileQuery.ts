import { useQuery, useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store/useAppStore';
import * as ProfileSvc from '../services/profile.service';
import type { UserProfile } from '../services/profile.service';
import type { StreakData } from '../types';

export const profileKeys = {
  detail: (uid: string) => ['profile', uid] as const,
};

export function useProfile() {
  const { user } = useAuth();
  const localStore = useAppStore();

  const query = useQuery({
    queryKey: profileKeys.detail(user?.id ?? 'local'),
    queryFn: async (): Promise<UserProfile> => {
      try {
        return await ProfileSvc.fetchProfile(user!.id);
      } catch (err: any) {
        // If profile doesn't exist yet, we seed it using local values
        const defaultProfile: Omit<UserProfile, 'id'> = {
          displayName: user?.email ? user.email.split('@')[0] : 'Member',
          avatarUrl: null,
          settings: localStore.userSettings,
          pomodoroSettings: localStore.pomodoroSettings,
          readingStreak: localStore.readingStreak,
          codingStreak: localStore.codingStreak,
          focusStreak: localStore.focusStreak,
        };
        return ProfileSvc.updateProfile(user!.id, defaultProfile);
      }
    },
    enabled: !!user,
    placeholderData: user ? undefined : {
      id: 'local',
      displayName: 'Member',
      avatarUrl: null,
      settings: localStore.userSettings,
      pomodoroSettings: localStore.pomodoroSettings,
      readingStreak: localStore.readingStreak,
      codingStreak: localStore.codingStreak,
      focusStreak: localStore.focusStreak,
    },
  });

  useEffect(() => {
    if (query.data && user) {
      useAppStore.setState({
        userSettings: { ...localStore.userSettings, ...query.data.settings },
        pomodoroSettings: { ...localStore.pomodoroSettings, ...query.data.pomodoroSettings },
        readingStreak: query.data.readingStreak,
        codingStreak: query.data.codingStreak,
        focusStreak: query.data.focusStreak,
        deletedReports: query.data.settings?.deletedReports || localStore.deletedReports || [],
      });
    }
  }, [query.data, user]);

  return query;
}

export function useUpdateProfile(): UseMutationResult<
  UserProfile,
  Error,
  Partial<Omit<UserProfile, 'id'>>
> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useAppStore();

  return useMutation({
    mutationFn: async (updates): Promise<UserProfile> => {
      if (!user) {
        if (updates.settings) localStore.updateUserSettings(updates.settings);
        if (updates.pomodoroSettings) localStore.updatePomodoroSettings(updates.pomodoroSettings);
        // offline updates for streaks could go here if needed, but normally handled by app actions
        return {
          id: 'local',
          displayName: 'Member',
          avatarUrl: null,
          settings: localStore.userSettings,
          pomodoroSettings: localStore.pomodoroSettings,
          readingStreak: localStore.readingStreak,
          codingStreak: localStore.codingStreak,
          focusStreak: localStore.focusStreak,
        };
      }
      return ProfileSvc.updateProfile(user.id, updates);
    },
    onSuccess: (data) => {
      if (user) {
        qc.setQueryData(profileKeys.detail(user.id), data);
      }
    },
  });
}
