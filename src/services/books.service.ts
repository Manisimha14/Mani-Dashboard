/**
 * Books Service — Supabase CRUD for books.
 */
import { supabase } from '../lib/supabase';
import type { Book } from '../types';

// ============================================================================
// Domain Specific Errors
// ============================================================================
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

// ============================================================================
// Helpers & Security Guards
// ============================================================================

/**
 * Derives user ID from active Supabase session securely and efficiently.
 */
async function getAuthenticatedUserId(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user?.id) {
    // Double check with secure getUser call if session lookup is ambiguous
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      throw new UnauthorizedError('Authentication required to perform this action.');
    }
    return user.id;
  }
  return session.user.id;
}

/**
 * Collapses duplicate inner spacing and trims outside margins.
 */
function normalizeString(value: string | undefined | null): string {
  return (value || '').trim().replace(/\s+/g, ' ');
}

/**
 * Enforces strict type validations on schemas, JSON shapes, and content bounds.
 */
function validateBookPayload(book: Omit<Book, 'id'>) {
  const title = normalizeString(book.title);
  if (!title) {
    throw new ValidationError('Book title is required and cannot be blank.');
  }
  if (title.length > 500) {
    throw new ValidationError('Book title cannot exceed 500 characters.');
  }

  const author = normalizeString(book.author);
  if (author.length > 500) {
    throw new ValidationError('Author name cannot exceed 500 characters.');
  }

  if (!Array.isArray(book.chapters)) {
    throw new ValidationError('Chapters must be provided as a structured array.');
  }

  for (let i = 0; i < book.chapters.length; i++) {
    const chapter = book.chapters[i];
    if (!chapter || typeof chapter !== 'object') {
      throw new ValidationError(`Chapter at index ${i} is not a valid object.`);
    }
    if (chapter.id === undefined || chapter.id === null) {
      throw new ValidationError(`Chapter at index ${i} is missing a unique ID.`);
    }
    if (typeof chapter.title !== 'string') {
      throw new ValidationError(`Chapter title for chapter ID "${chapter.id}" must be a string.`);
    }
    if (typeof chapter.completed !== 'boolean') {
      throw new ValidationError(`Chapter completed state for "${chapter.title}" must be a boolean.`);
    }
    if (chapter.dateCompleted !== undefined && typeof chapter.dateCompleted !== 'string') {
      throw new ValidationError(`Chapter completion date for "${chapter.title}" must be a string format.`);
    }
  }
}

/**
 * Selective transient-only retry utility to prevent RLS/validation loops.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 500): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // If it's a domain validation or authorization error, abort retry instantly
    if (
      error instanceof ValidationError ||
      error instanceof UnauthorizedError ||
      error instanceof NotFoundError
    ) {
      throw error;
    }

    // Supabase standard RLS check or validation status code aborts
    const status = error?.status || error?.statusCode;
    if (status && status >= 400 && status < 500) {
      throw error;
    }

    if (retries > 0) {
      await new Promise((res) => setTimeout(res, delayMs));
      return withRetry(fn, retries - 1, delayMs * 2);
    }
    throw new NetworkError(error?.message || 'A transient network failure occurred.');
  }
}

// ============================================================================
// Service Repository Operations
// ============================================================================

/**
 * Retrieves the current authenticated user's books.
 */
export async function fetchMyBooks(): Promise<Book[]> {
  const userId = await getAuthenticatedUserId();

  return withRetry(async () => {
    const { data, error } = await supabase
      .from('books')
      .select(`
        id,
        title,
        author,
        chapters,
        start_date,
        target_end_date,
        cover_color
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? []).map(r => ({
      id: r.id,
      title: r.title,
      author: r.author,
      chapters: r.chapters ?? [],
      startDate: r.start_date ?? undefined,
      targetEndDate: r.target_end_date ?? undefined,
      coverColor: r.cover_color,
    }));
  });
}

/**
 * Creates a brand new book.
 */
export async function createBook(book: Omit<Book, 'id'> & { id?: string }): Promise<Book> {
  const userId = await getAuthenticatedUserId();
  validateBookPayload(book);

  const payload = {
    user_id: userId,
    title: normalizeString(book.title),
    author: normalizeString(book.author),
    chapters: book.chapters,
    start_date: book.startDate ?? null,
    target_end_date: book.targetEndDate ?? null,
    cover_color: book.coverColor,
  };

  return withRetry(async () => {
    const { data, error } = await supabase
      .from('books')
      .insert(payload)
      .select(`
        id,
        title,
        author,
        chapters,
        start_date,
        target_end_date,
        cover_color
      `)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      title: data.title,
      author: data.author,
      chapters: data.chapters ?? [],
      startDate: data.start_date ?? undefined,
      targetEndDate: data.target_end_date ?? undefined,
      coverColor: data.cover_color,
    };
  });
}

/**
 * Updates an existing book owned by the user.
 */
export async function updateBook(book: Book): Promise<Book> {
  const userId = await getAuthenticatedUserId();
  if (!book.id) {
    throw new ValidationError('Cannot update a book record without a valid ID.');
  }
  validateBookPayload(book);

  const payload = {
    title: normalizeString(book.title),
    author: normalizeString(book.author),
    chapters: book.chapters,
    start_date: book.startDate ?? null,
    target_end_date: book.targetEndDate ?? null,
    cover_color: book.coverColor,
  };

  return withRetry(async () => {
    const { data, error } = await supabase
      .from('books')
      .update(payload)
      .eq('id', book.id)
      .eq('user_id', userId)
      .select(`
        id,
        title,
        author,
        chapters,
        start_date,
        target_end_date,
        cover_color
      `);

    if (error) throw error;

    // Guard: Verify affected rows to confirm ownership and record existence
    if (!data || data.length === 0) {
      throw new NotFoundError('Book record not found, or you are unauthorized to modify this resource.');
    }

    const updated = data[0];
    return {
      id: updated.id,
      title: updated.title,
      author: updated.author,
      chapters: updated.chapters ?? [],
      startDate: updated.start_date ?? undefined,
      targetEndDate: updated.target_end_date ?? undefined,
      coverColor: updated.cover_color,
    };
  });
}

/**
 * Deletes a book owned by the user.
 */
export async function deleteBook(id: string): Promise<void> {
  const userId = await getAuthenticatedUserId();
  if (!id) {
    throw new ValidationError('Book ID is required for deletion.');
  }

  return withRetry(async () => {
    const { data, error } = await supabase
      .from('books')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id');

    if (error) throw error;

    // Guard: Verify affected rows to confirm deletion actually occurred
    if (!data || data.length === 0) {
      throw new NotFoundError('Book record not found, or you are unauthorized to delete this resource.');
    }
  });
}
