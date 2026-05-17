import { useQuery, useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store/useAppStore';
import * as LeetCodeSvc from '../services/leetcode.service';
import type { LeetCodeProblem } from '../types';

export const leetcodeKeys = {
  all: (uid: string) => ['leetcode', uid] as const,
};

export function useProblems() {
  const { user } = useAuth();
  const localStore = useAppStore();

  return useQuery({
    queryKey: leetcodeKeys.all(user?.id ?? 'local'),
    queryFn: () => user
      ? LeetCodeSvc.fetchProblems(user.id)
      : Promise.resolve(localStore.problems),
  });
}

export function useAddProblem(): UseMutationResult<unknown, Error, Omit<LeetCodeProblem, 'id'>> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useAppStore();

  return useMutation({
    mutationFn: async (problem): Promise<unknown> => user
      ? LeetCodeSvc.insertProblem(user.id, problem)
      : localStore.addProblem(problem),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leetcodeKeys.all(user?.id ?? 'local') });
    },
  });
}

export function useUpdateProblem(): UseMutationResult<void, Error, { id: string; updates: Partial<LeetCodeProblem> }> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useAppStore();

  return useMutation({
    mutationFn: async ({ id, updates }) => user
      ? LeetCodeSvc.updateProblem(id, updates)
      : localStore.updateProblem(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leetcodeKeys.all(user?.id ?? 'local') });
    },
  });
}

export function useDeleteProblem(): UseMutationResult<void, Error, string> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useAppStore();

  return useMutation({
    mutationFn: async (id) => user
      ? LeetCodeSvc.deleteProblem(id)
      : localStore.deleteProblem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leetcodeKeys.all(user?.id ?? 'local') });
    },
  });
}

export function useToggleProblem(): UseMutationResult<void, Error, { id: string, current: boolean, status: string }> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useAppStore();

  return useMutation({
    mutationFn: async ({ id, current, status }) => user
      ? LeetCodeSvc.updateProblem(id, { completed: !current, status: !current ? 'solved' : (status === 'solved' ? 'attempted' : status as any) })
      : localStore.toggleProblem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leetcodeKeys.all(user?.id ?? 'local') });
    },
  });
}

