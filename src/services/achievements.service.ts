/**
 * Achievements Service — Supabase CRUD for achievements.
 */
import { supabase } from '../lib/supabase';
import { DEFAULT_ACHIEVEMENTS } from '../lib/data';
import type { Achievement } from '../types';

export async function fetchAchievements(userId: string): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;

  const dbMap = new Map<string, any>();
  for (const row of (data ?? [])) {
    dbMap.set(row.achievement_id, row);
  }

  // Merge static default definitions with database records
  return DEFAULT_ACHIEVEMENTS.map(staticDef => {
    const dbRow = dbMap.get(staticDef.id);
    if (!dbRow) return staticDef;

    return {
      ...staticDef,
      unlocked: dbRow.unlocked,
      unlockedAt: dbRow.unlocked_at ?? undefined,
      progress: dbRow.progress ?? staticDef.progress,
    };
  });
}

export async function updateAchievement(
  userId: string,
  achievementId: string,
  updates: Partial<Pick<Achievement, 'unlocked' | 'unlockedAt' | 'progress'>>
): Promise<void> {
  const payload: Record<string, any> = {
    user_id: userId,
    achievement_id: achievementId,
  };
  if (updates.unlocked !== undefined)   payload.unlocked    = updates.unlocked;
  if (updates.unlockedAt !== undefined) payload.unlocked_at = updates.unlockedAt;
  if (updates.progress !== undefined)   payload.progress    = updates.progress;

  const { error } = await supabase
    .from('achievements')
    .upsert(payload, { onConflict: 'user_id,achievement_id' });

  if (error) throw error;
}

export async function bulkUpsertAchievements(
  userId: string,
  records: { id: string; unlocked: boolean; unlockedAt?: string; progress?: number }[]
): Promise<void> {
  if (!records.length) return;
  const { error } = await supabase.from('achievements').upsert(
    records.map(r => ({
      user_id: userId,
      achievement_id: r.id,
      unlocked: r.unlocked,
      unlocked_at: r.unlockedAt ?? null,
      progress: r.progress ?? 0,
    })),
    { onConflict: 'user_id,achievement_id' }
  );
  if (error) throw error;
}
