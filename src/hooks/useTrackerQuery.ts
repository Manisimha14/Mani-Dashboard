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
  const trackers = useAppStore(s => s.trackers);

  return useQuery({
    queryKey: trackerKeys.all(user?.id ?? 'local'),
    queryFn: () => user
      ? TrackerSvc.fetchTrackers(user.id)
      : Promise.resolve(trackers),
  });
}

export function useAddTracker(): UseMutationResult<unknown, Error, Omit<Tracker, 'id' | 'createdAt'> & { id?: string }> {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (tracker) => {
      const store = useAppStore.getState();
      if (user) {
        const { items, ...rest } = tracker;
        return TrackerSvc.insertTracker(user.id, rest);
      } else {
        return store.addTracker(tracker);
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

  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const store = useAppStore.getState();
      return user
        ? TrackerSvc.updateTracker(id, updates)
        : store.updateTracker(id, updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trackerKeys.all(user?.id ?? 'local') });
    },
  });
}

export function useDeleteTracker(): UseMutationResult<void, Error, string> {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const store = useAppStore.getState();
      return user
        ? TrackerSvc.deleteTracker(id)
        : store.deleteTracker(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trackerKeys.all(user?.id ?? 'local') });
    },
  });
}

export function useAddTrackerItem(): UseMutationResult<unknown, Error, { trackerId: string; item: Omit<TrackerItem, 'id'> }> {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ trackerId, item }) => {
      const store = useAppStore.getState();
      if (user) {
        const res = await TrackerSvc.insertTrackerItem(user.id, trackerId, item);
        const trackers = qc.getQueryData<Tracker[]>(trackerKeys.all(user.id)) || [];
        const tracker = trackers.find(t => t.id === trackerId);
        store.addXp(50, 'tracker', `Logged item for tracker: ${tracker?.title ?? 'Custom Tracker'}`);
        store.addNotification({
          title: 'Tracker Item Logged',
          message: `Logged entry: "${item.value}" in "${tracker?.title ?? 'Custom Tracker'}". +50 XP rewarded!`,
          category: 'reminders',
          priority: 'normal'
        });
        return res;
      } else {
        return store.addTrackerItem(trackerId, item);
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

  return useMutation({
    mutationFn: async ({ trackerId, itemId, updates }) => {
      const store = useAppStore.getState();
      return user
        ? TrackerSvc.updateTrackerItem(itemId, updates)
        : store.updateTrackerItem(trackerId, itemId, updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trackerKeys.all(user?.id ?? 'local') });
    },
  });
}

export function useDeleteTrackerItem(): UseMutationResult<void, Error, { trackerId: string; itemId: string }> {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ trackerId, itemId }) => {
      const store = useAppStore.getState();
      return user
        ? TrackerSvc.deleteTrackerItem(itemId)
        : store.deleteTrackerItem(trackerId, itemId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: trackerKeys.all(user?.id ?? 'local') });
    },
  });
}

