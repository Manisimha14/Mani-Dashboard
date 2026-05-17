/**
 * Books Service — Supabase CRUD for books.
 */
import { supabase } from '../lib/supabase';
import type { Book } from '../types';

export async function fetchUserBooks(userId: string): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select('*')
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
}

export async function upsertBook(userId: string, book: Book): Promise<Book> {
  const payload = {
    id: book.id || undefined, // let database generate if none
    user_id: userId,
    title: book.title,
    author: book.author,
    chapters: book.chapters,
    start_date: book.startDate ?? null,
    target_end_date: book.targetEndDate ?? null,
    cover_color: book.coverColor,
  };

  const { data, error } = await supabase
    .from('books')
    .upsert(payload, { onConflict: 'id' })
    .select()
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
}

export async function deleteBook(id: string): Promise<void> {
  const { error } = await supabase.from('books').delete().eq('id', id);
  if (error) throw error;
}
