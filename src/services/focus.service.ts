/**
 * Focus Service — Supabase CRUD for focus_sessions.
 */
import { supabase } from '../lib/supabase';
import type { FocusSession } from '../types';

function rowToSession(r: any): FocusSession {
  return {
    id: r.id,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time ?? undefined,
    duration: r.duration,
    actualDuration: r.actual_duration ?? undefined,
    completed: r.completed,
    failed: r.failed,
    taskName: r.task_name ?? undefined,
    taskTags: r.task_tags ?? undefined,
    growthTheme: r.growth_theme,
    ambience: r.ambience,
    reflection: r.reflection ?? undefined,
    mood: r.mood ?? undefined,
    productivityScore: r.productivity_score ?? undefined,
    mode: r.mode,
  };
}

export async function fetchFocusSessions(userId: string): Promise<FocusSession[]> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToSession);
}

export async function insertFocusSession(
  userId: string,
  session: Omit<FocusSession, 'id'>
): Promise<FocusSession> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .insert({
      user_id: userId,
      date: session.date,
      start_time: session.startTime,
      end_time: session.endTime ?? null,
      duration: session.duration,
      actual_duration: session.actualDuration ?? null,
      completed: session.completed,
      failed: session.failed,
      task_name: session.taskName ?? null,
      task_tags: session.taskTags ?? null,
      growth_theme: session.growthTheme,
      ambience: session.ambience,
      reflection: session.reflection ?? null,
      mood: session.mood ?? null,
      productivity_score: session.productivityScore ?? null,
      mode: session.mode,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToSession(data);
}

export async function updateFocusSession(
  id: string,
  updates: Partial<FocusSession>
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.endTime !== undefined)         patch.end_time          = updates.endTime;
  if (updates.actualDuration !== undefined)  patch.actual_duration   = updates.actualDuration;
  if (updates.completed !== undefined)       patch.completed         = updates.completed;
  if (updates.failed !== undefined)          patch.failed            = updates.failed;
  if (updates.reflection !== undefined)      patch.reflection        = updates.reflection;
  if (updates.mood !== undefined)            patch.mood              = updates.mood;
  if (updates.productivityScore !== undefined) patch.productivity_score = updates.productivityScore;
  const { error } = await supabase.from('focus_sessions').update(patch).eq('id', id);
  if (error) throw error;
}

export async function bulkInsertFocusSessions(
  userId: string,
  sessions: Omit<FocusSession, 'id'>[]
): Promise<void> {
  if (!sessions.length) return;
  const { error } = await supabase.from('focus_sessions').insert(
    sessions.map(s => ({
      user_id: userId,
      date: s.date, start_time: s.startTime, end_time: s.endTime ?? null,
      duration: s.duration, actual_duration: s.actualDuration ?? null,
      completed: s.completed, failed: s.failed,
      task_name: s.taskName ?? null, task_tags: s.taskTags ?? null,
      growth_theme: s.growthTheme, ambience: s.ambience,
      reflection: s.reflection ?? null, mood: s.mood ?? null,
      productivity_score: s.productivityScore ?? null, mode: s.mode,
    }))
  );
  if (error) throw error;
}
