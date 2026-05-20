import { useQuery, useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store/useAppStore';
import * as LeetCodeSvc from '../services/leetcode.service';
import * as ActivitySvc from '../services/activity.service';
import { todayString, getProductivityScore } from '../lib/utils';
import type { LeetCodeProblem, DailyActivity } from '../types';
import { activityKeys } from './useActivityQuery';

export const leetcodeKeys = {
  all: (uid: string) => ['leetcode', uid] as const,
};

export function useProblems() {
  const { user } = useAuth();
  const problems = useAppStore(s => s.problems);

  return useQuery({
    queryKey: leetcodeKeys.all(user?.id ?? 'local'),
    queryFn: () => user
      ? LeetCodeSvc.fetchProblems(user.id)
      : Promise.resolve(problems),
  });
}

export function useAddProblem(): UseMutationResult<unknown, Error, Omit<LeetCodeProblem, 'id'>> {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (problem): Promise<unknown> => {
      const store = useAppStore.getState();
      if (!user) {
        return store.addProblem(problem);
      }
      
      const res = await LeetCodeSvc.insertProblem(user.id, problem);
      
      if (problem.completed) {
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

        todayAct.problemsSolved = Math.max(0, todayAct.problemsSolved + 1);
        todayAct.productivityScore = getProductivityScore(
          todayAct.chaptersRead,
          todayAct.problemsSolved,
          todayAct.focusMinutes
        );

        await ActivitySvc.upsertDailyActivity(user.id, todayAct);

        // Award XP and dispatch notification for authenticated LeetCode solves
        store.addXp(150, 'coding', `Solved problem: ${problem.name}`);
        store.addNotification({
          title: 'LeetCode Problem Solved',
          message: `"${problem.name}" [${problem.difficulty}] logged successfully. +150 XP rewarded!`,
          category: 'streak',
          priority: 'normal'
        });
      }
      
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leetcodeKeys.all(user?.id ?? 'local') });
      qc.invalidateQueries({ queryKey: activityKeys.all(user?.id ?? 'local') });
    },
  });
}

export function useUpdateProblem(): UseMutationResult<void, Error, { id: string; updates: Partial<LeetCodeProblem> }> {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const store = useAppStore.getState();
      return user
        ? LeetCodeSvc.updateProblem(id, updates)
        : store.updateProblem(id, updates);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leetcodeKeys.all(user?.id ?? 'local') });
    },
  });
}

export function useDeleteProblem(): UseMutationResult<void, Error, string> {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const store = useAppStore.getState();
      if (!user) {
        return store.deleteProblem(id);
      }

      const currentProblems = await qc.fetchQuery<LeetCodeProblem[]>({
        queryKey: leetcodeKeys.all(user.id),
      });
      const problem = currentProblems.find(p => p.id === id);

      await LeetCodeSvc.deleteProblem(id);

      if (problem?.completed) {
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

        todayAct.problemsSolved = Math.max(0, todayAct.problemsSolved - 1);
        todayAct.productivityScore = getProductivityScore(
          todayAct.chaptersRead,
          todayAct.problemsSolved,
          todayAct.focusMinutes
        );

        await ActivitySvc.upsertDailyActivity(user.id, todayAct);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leetcodeKeys.all(user?.id ?? 'local') });
      qc.invalidateQueries({ queryKey: activityKeys.all(user?.id ?? 'local') });
    },
  });
}

export function useToggleProblem(): UseMutationResult<void, Error, { id: string; current: boolean; status: string }> {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, current, status }) => {
      const store = useAppStore.getState();
      if (!user) {
        return store.toggleProblem(id);
      }

      const newCompleted = !current;
      const today = todayString();
      await LeetCodeSvc.updateProblem(id, { 
        completed: newCompleted, 
        status: newCompleted ? 'solved' : (status === 'solved' ? 'attempted' : status as any),
        date: newCompleted ? today : undefined
      });

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

      const delta = newCompleted ? 1 : -1;
      todayAct.problemsSolved = Math.max(0, todayAct.problemsSolved + delta);
      todayAct.productivityScore = getProductivityScore(
        todayAct.chaptersRead,
        todayAct.problemsSolved,
        todayAct.focusMinutes
      );

      await ActivitySvc.upsertDailyActivity(user.id, todayAct);

      // Award XP and dispatch notification for authenticated LeetCode solves
      const currentProblems = qc.getQueryData<LeetCodeProblem[]>(leetcodeKeys.all(user.id)) || [];
      const problem = currentProblems.find(p => p.id === id);
      const problemName = problem?.name ?? 'LeetCode Problem';
      const difficulty = problem?.difficulty ?? 'Medium';

      if (newCompleted) {
        store.addXp(150, 'coding', `Solved problem: ${problemName}`);
        store.addNotification({
          title: 'LeetCode Problem Solved',
          message: `"${problemName}" [${difficulty}] logged successfully. +150 XP rewarded!`,
          category: 'streak',
          priority: 'normal'
        });
      } else {
        store.addXp(-150, 'coding', `Unsolved problem: ${problemName}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leetcodeKeys.all(user?.id ?? 'local') });
      qc.invalidateQueries({ queryKey: activityKeys.all(user?.id ?? 'local') });
    },
  });
}

