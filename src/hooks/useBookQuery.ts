import { useQuery, useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store/useAppStore';
import * as BookSvc from '../services/books.service';
import * as ActivitySvc from '../services/activity.service';
import { todayString, getProductivityScore } from '../lib/utils';
import type { Book, DailyActivity } from '../types';
import { activityKeys } from './useActivityQuery';

export const bookKeys = {
  all: (uid: string) => ['books', uid] as const,
};

export function useBook() {
  const { user } = useAuth();
  const localStore = useAppStore();

  return useQuery({
    queryKey: bookKeys.all(user?.id ?? 'local'),
    queryFn: async (): Promise<Book> => {
      if (!user) {
        return localStore.book;
      }
      const books = await BookSvc.fetchUserBooks(user.id);
      if (books.length > 0) {
        return books[0];
      }
      // Seed a default book in the database if the user has none
      const defaultBook = { ...localStore.book, id: '' };
      return BookSvc.upsertBook(user.id, defaultBook);
    },
  });
}

export function useUpdateChapter(): UseMutationResult<
  Book,
  Error,
  { chapterId: number; updates: Partial<Book['chapters'][0]> }
> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useAppStore();

  return useMutation({
    mutationFn: async ({ chapterId, updates }): Promise<Book> => {
      if (!user) {
        localStore.updateChapter(chapterId, updates);
        return localStore.book;
      }
      
      const currentBook = await qc.fetchQuery<Book>({
        queryKey: bookKeys.all(user.id),
      });

      const updatedChapters = currentBook.chapters.map(c => {
        if (c.id === chapterId) {
          const completed = updates.completed !== undefined ? updates.completed : c.completed;
          return {
            ...c,
            ...updates,
            dateCompleted: completed && !c.completed ? todayString() : (completed === false ? undefined : c.dateCompleted)
          };
        }
        return c;
      });

      const updatedBook = { ...currentBook, chapters: updatedChapters };

      // Update daily activity in Supabase if completed state is changing
      if (updates.completed !== undefined) {
        const prevChapter = currentBook.chapters.find(c => c.id === chapterId);
        const prevCompleted = !!prevChapter?.completed;
        const newCompleted = !!updates.completed;

        if (prevCompleted !== newCompleted) {
          const delta = newCompleted ? 1 : -1;
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

          todayAct.chaptersRead = Math.max(0, todayAct.chaptersRead + delta);
          todayAct.productivityScore = getProductivityScore(
            todayAct.chaptersRead,
            todayAct.problemsSolved,
            todayAct.focusMinutes
          );

          await ActivitySvc.upsertDailyActivity(user.id, todayAct);
        }
      }

      return BookSvc.upsertBook(user.id, updatedBook);
    },
    onSuccess: (data) => {
      qc.setQueryData(bookKeys.all(user?.id ?? 'local'), data);
      if (user) {
        qc.invalidateQueries({ queryKey: activityKeys.all(user.id) });
      }
    },
  });
}

export function useSetBookMeta(): UseMutationResult<
  Book,
  Error,
  Partial<Pick<Book, 'title' | 'author' | 'targetEndDate' | 'coverColor'>>
> {
  const { user } = useAuth();
  const qc = useQueryClient();
  const localStore = useAppStore();

  return useMutation({
    mutationFn: async (meta): Promise<Book> => {
      if (!user) {
        localStore.setBookMeta(meta);
        return localStore.book;
      }

      const currentBook = await qc.fetchQuery<Book>({
        queryKey: bookKeys.all(user.id),
      });

      const updatedBook = { ...currentBook, ...meta };
      return BookSvc.upsertBook(user.id, updatedBook);
    },
    onSuccess: (data) => {
      qc.setQueryData(bookKeys.all(user?.id ?? 'local'), data);
    },
  });
}
