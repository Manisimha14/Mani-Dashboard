import { useQuery, useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store/useAppStore';
import * as BookSvc from '../services/books.service';
import type { Book } from '../types';

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
      const defaultBook = localStore.book;
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

      const updatedChapters = currentBook.chapters.map(c => 
         c.id === chapterId ? { ...c, ...updates } : c
      );

      const updatedBook = { ...currentBook, chapters: updatedChapters };
      return BookSvc.upsertBook(user.id, updatedBook);
    },
    onSuccess: (data) => {
      qc.setQueryData(bookKeys.all(user?.id ?? 'local'), data);
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

