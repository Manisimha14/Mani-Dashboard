/**
 * Profile Service — Supabase CRUD for profiles (streaks, settings, metadata).
 */
import { supabase } from '../lib/supabase';
import type { StreakData, UserSettings, PomodoroSettings } from '../types';

export interface UserProfile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  settings: Partial<UserSettings>;
  pomodoroSettings: Partial<PomodoroSettings>;
  readingStreak: StreakData;
  codingStreak: StreakData;
  focusStreak: StreakData;
}

function rowToProfile(r: any): UserProfile {
  return {
    id: r.id,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    settings: r.settings ?? {},
    pomodoroSettings: r.pomodoro_settings ?? {},
    readingStreak: r.reading_streak ?? { currentStreak: 0, longestStreak: 0, history: {} },
    codingStreak: r.coding_streak ?? { currentStreak: 0, longestStreak: 0, history: {} },
    focusStreak: r.focus_streak ?? { currentStreak: 0, longestStreak: 0, history: {} },
  };
}

export async function fetchProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return rowToProfile(data);
}

export async function updateProfile(
  userId: string,
  updates: Partial<Omit<UserProfile, 'id'>>
): Promise<UserProfile> {
  const patch: Record<string, unknown> = { id: userId };
  if (updates.displayName !== undefined)     patch.display_name    = updates.displayName;
  if (updates.avatarUrl !== undefined)       patch.avatar_url      = updates.avatarUrl;
  if (updates.settings !== undefined)        patch.settings        = updates.settings;
  if (updates.pomodoroSettings !== undefined) patch.pomodoro_settings = updates.pomodoroSettings;
  if (updates.readingStreak !== undefined)   patch.reading_streak  = updates.readingStreak;
  if (updates.codingStreak !== undefined)    patch.coding_streak   = updates.codingStreak;
  if (updates.focusStreak !== undefined)     patch.focus_streak    = updates.focusStreak;

  const { data, error } = await supabase
    .from('profiles')
    .upsert(patch)
    .select()
    .single();

  if (error) throw error;
  return rowToProfile(data);
}
