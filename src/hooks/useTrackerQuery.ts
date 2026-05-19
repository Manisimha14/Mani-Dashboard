import { useQuery, useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store/useAppStore';
import * as TrackerSvc from '../services/trackers.service';
import type { Tracker, TrackerItem } from '../types';

export const trackerKeys = {
  all: (uid: string) => ['trackers', uid] as const,
};

export function useTrackers() {
  const { user } = useAuth();
  const localStore = useAppStore();

  return useQuery({
    queryKey: trackerKeys.all(user?.id ?? 'local'),
    queryFn: () => user
      ? TrackerSvc.fetchTrackers(user.id)
      : Promise.resolve(localStore.trackers),
  });
}

export function useAddTracker(): UseMutationResult<unknown, Error, Omit<Tracker, 'id' | 'createdAt'> & { id?: string }> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useAppStore();

  return useMutation({
    mutationFn: async (tracker) => {
      if (user) {
        const { items, ...rest } = tracker;
        return TrackerSvc.insertTracker(user.id, rest);
      } else {
        return localStore.addTracker(tracker);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trackerKeys.all(user?.id ?? 'local') });
    },
  });
}

export function useUpdateTracker(): UseMutationResult<void, Error, { id: string; updates: Partial<Tracker> }> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useAppStore();

  return useMutation({
    mutationFn: async ({ id, updates }) => user
      ? TrackerSvc.updateTracker(id, updates)
      : localStore.updateTracker(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trackerKeys.all(user?.id ?? 'local') });
    },
  });
}

export function useDeleteTracker(): UseMutationResult<void, Error, string> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useAppStore();

  return useMutation({
    mutationFn: async (id) => user
      ? TrackerSvc.deleteTracker(id)
      : localStore.deleteTracker(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trackerKeys.all(user?.id ?? 'local') });
    },
  });
}

export function useAddTrackerItem(): UseMutationResult<unknown, Error, { trackerId: string; item: Omit<TrackerItem, 'id'> }> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useAppStore();

  return useMutation({
    mutationFn: async ({ trackerId, item }) => {
      if (user) {
        const res = await TrackerSvc.insertTrackerItem(user.id, trackerId, item);
        const trackers = qc.getQueryData<Tracker[]>(trackerKeys.all(user.id)) || [];
        const tracker = trackers.find(t => t.id === trackerId);
        localStore.addXp(50, 'tracker', `Logged item for tracker: ${tracker?.title ?? 'Custom Tracker'}`);
        localStore.addNotification({
          title: 'Tracker Item Logged',
          message: `Logged entry: "${item.value}" in "${tracker?.title ?? 'Custom Tracker'}". +50 XP rewarded!`,
          category: 'reminders',
          priority: 'normal'
        });
        return res;
      } else {
        return localStore.addTrackerItem(trackerId, item);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trackerKeys.all(user?.id ?? 'local') });
    },
  });
}

export function useUpdateTrackerItem(): UseMutationResult<void, Error, { trackerId: string; itemId: string; updates: Partial<TrackerItem> }> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useAppStore();

  return useMutation({
    mutationFn: async ({ trackerId, itemId, updates }) => user
      ? TrackerSvc.updateTrackerItem(itemId, updates)
      : localStore.updateTrackerItem(trackerId, itemId, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trackerKeys.all(user?.id ?? 'local') });
    },
  });
}

export function useDeleteTrackerItem(): UseMutationResult<void, Error, { trackerId: string; itemId: string }> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useAppStore();

  return useMutation({
    mutationFn: async ({ trackerId, itemId }) => user
      ? TrackerSvc.deleteTrackerItem(itemId)
      : localStore.deleteTrackerItem(trackerId, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trackerKeys.all(user?.id ?? 'local') });
    },
  });
}

