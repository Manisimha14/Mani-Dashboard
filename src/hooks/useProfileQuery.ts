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

  const query = useQuery({
    queryKey: profileKeys.detail(user?.id ?? 'local'),
    queryFn: async (): Promise<UserProfile> => {
      const store = useAppStore.getState();
      try {
        return await ProfileSvc.fetchProfile(user!.id);
      } catch (err: any) {
        // If profile doesn't exist yet, we seed it using local values
        const defaultProfile: Omit<UserProfile, 'id'> = {
          displayName: user?.email ? user.email.split('@')[0] : 'Member',
          avatarUrl: null,
          settings: store.userSettings,
          pomodoroSettings: store.pomodoroSettings,
          readingStreak: store.readingStreak,
          codingStreak: store.codingStreak,
          focusStreak: store.focusStreak,
        };
        return ProfileSvc.updateProfile(user!.id, defaultProfile);
      }
    },
    enabled: !!user,
    placeholderData: () => {
      const store = useAppStore.getState();
      return {
        id: 'local',
        displayName: 'Member',
        avatarUrl: null,
        settings: store.userSettings,
        pomodoroSettings: store.pomodoroSettings,
        readingStreak: store.readingStreak,
        codingStreak: store.codingStreak,
        focusStreak: store.focusStreak,
      };
    },
  });

  useEffect(() => {
    if (query.data && user) {
      const store = useAppStore.getState();
      useAppStore.setState({
        userSettings: { ...store.userSettings, ...query.data.settings },
        pomodoroSettings: { ...store.pomodoroSettings, ...query.data.pomodoroSettings },
        readingStreak: query.data.readingStreak,
        codingStreak: query.data.codingStreak,
        focusStreak: query.data.focusStreak,
        deletedReports: query.data.settings?.deletedReports || store.deletedReports || [],
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

  return useMutation({
    mutationFn: async (updates): Promise<UserProfile> => {
      const store = useAppStore.getState();
      if (!user) {
        if (updates.settings) store.updateUserSettings(updates.settings);
        if (updates.pomodoroSettings) store.updatePomodoroSettings(updates.pomodoroSettings);
        // offline updates for streaks could go here if needed, but normally handled by app actions
        return {
          id: 'local',
          displayName: 'Member',
          avatarUrl: null,
          settings: store.userSettings,
          pomodoroSettings: store.pomodoroSettings,
          readingStreak: store.readingStreak,
          codingStreak: store.codingStreak,
          focusStreak: store.focusStreak,
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
