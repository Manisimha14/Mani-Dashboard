/**
 * Activity Service — Supabase CRUD for Daily Activity metrics.
 */
import { supabase } from '../lib/supabase';
import type { DailyActivity } from '../types';

export async function fetchDailyActivities(userId: string): Promise<DailyActivity[]> {
  const { data, error } = await supabase
    .from('daily_activity')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true });

  if (error) throw error;

  return (data ?? []).map(r => ({
    date: r.date,
    chaptersRead: r.chapters_read,
    problemsSolved: r.problems_solved,
    focusMinutes: r.focus_minutes,
    productivityScore: r.productivity_score,
  }));
}

export async function upsertDailyActivity(userId: string, act: DailyActivity): Promise<void> {
  const { error } = await supabase
    .from('daily_activity')
    .upsert({
      user_id: userId,
      date: act.date,
      chapters_read: act.chaptersRead,
      problems_solved: act.problemsSolved,
      focus_minutes: act.focusMinutes,
      productivity_score: act.productivityScore,
    }, { onConflict: 'user_id,date' });

  if (error) throw error;
}
