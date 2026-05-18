import { useQuery, useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store/useAppStore';
import * as FocusSvc from '../services/focus.service';
import type { FocusSession } from '../types';

export const focusKeys = {
  all: (uid: string) => ['focus', uid] as const,
};

export function useFocusSessions() {
  const { user } = useAuth();
  const localStore = useAppStore();

  return useQuery({
    queryKey: focusKeys.all(user?.id ?? 'local'),
    queryFn: () => user
      ? FocusSvc.fetchFocusSessions(user.id)
      : Promise.resolve(localStore.focusSessions),
  });
}

export function useAddFocusSession(): UseMutationResult<FocusSession | void, Error, Omit<FocusSession, 'id'>> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useAppStore();

  return useMutation({
    mutationFn: async (session): Promise<FocusSession | void> => user
      ? FocusSvc.insertFocusSession(user.id, session)
      : localStore.addFocusSession(session),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: focusKeys.all(user?.id ?? 'local') });
    },
  });
}

export function useUpdateFocusSession(): UseMutationResult<void, Error, { id: string; updates: Partial<FocusSession> }> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useAppStore();

  return useMutation({
    mutationFn: async ({ id, updates }) => user
      ? FocusSvc.updateFocusSession(id, updates)
      : localStore.updateFocusSession(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: focusKeys.all(user?.id ?? 'local') });
    },
  });
}
