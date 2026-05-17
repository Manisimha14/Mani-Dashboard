/**
 * Migration utility — one-time import of localStorage data → Supabase.
 *
 * Each domain is migrated independently so a failure in one
 * doesn't block the others. All errors are collected and reported.
 */
import { supabase } from '../lib/supabase';
import { generateId } from './utils';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function ensureUUID(id: any): string {
  if (typeof id === 'string' && UUID_REGEX.test(id)) {
    return id;
  }
  return generateId();
}

export type MigrationResult = {
  success: boolean;
  details: Record<string, number>;
  errors: Record<string, string>;
};

async function safeInsert(
  table: string,
  rows: any[],
  opts?: { onConflict?: string }
): Promise<{ count: number; error: string | null }> {
  if (!rows.length) return { count: 0, error: null };
  const q = opts?.onConflict
    ? supabase.from(table).upsert(rows, { onConflict: opts.onConflict })
    : supabase.from(table).insert(rows);
  const { error } = await q;
  if (error) {
    console.error(`[Migration] ${table}:`, error.message, error.details);
    return { count: 0, error: `${error.message}${error.details ? ` — ${error.details}` : ''}` };
  }
  return { count: rows.length, error: null };
}

export async function migrateLocalStorageToSupabase(userId: string): Promise<MigrationResult> {
  const details: Record<string, number> = {};
  const errors: Record<string, string> = {};

  // ── Read Zustand snapshots ──────────────────────────────────────────────────
  let app: any = {};
  let health: any = {};
  let appRaw: string | null = null;

  try {
    appRaw = localStorage.getItem('dashboard-storage');
    const healthRaw = localStorage.getItem('health-storage');
    app    = appRaw    ? (JSON.parse(appRaw)?.state    ?? {}) : {};
    health = healthRaw ? (JSON.parse(healthRaw)?.state ?? {}) : {};
  } catch (e: any) {
    return { success: false, details, errors: { parse: `Failed to read localStorage: ${e.message}` } };
  }

  console.log('[Migration] Starting. App keys:', Object.keys(app), '| Health keys:', Object.keys(health));

  // ── Health Meals ────────────────────────────────────────────────────────────
  {
    const rows = (health.meals ?? []).map((m: any) => ({
      user_id: userId, date: m.date, time: m.time,
      meal_type: m.mealType, name: m.name,
      calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat,
      fiber: m.fiber ?? null, quantity: m.quantity ?? null,
      is_favorite: m.isFavorite ?? false,
    }));
    const r = await safeInsert('health_meals', rows);
    if (r.error) errors.meals = r.error; else details.meals = r.count;
  }

  // ── Health Water ────────────────────────────────────────────────────────────
  {
    const rows = (health.water ?? []).map((w: any) => ({
      user_id: userId, date: w.date, time: w.time, amount: w.amount,
    }));
    const r = await safeInsert('health_water', rows);
    if (r.error) errors.water = r.error; else details.water = r.count;
  }

  // ── Health Workouts ─────────────────────────────────────────────────────────
  {
    const rows = (health.workouts ?? []).map((w: any) => ({
      user_id: userId, date: w.date, start_time: w.startTime,
      name: w.name, type: w.type, duration_minutes: w.durationMinutes,
      calories_burned: w.caloriesBurned ?? null, notes: w.notes ?? null,
    }));
    const r = await safeInsert('health_workouts', rows);
    if (r.error) errors.workouts = r.error; else details.workouts = r.count;
  }

  // ── Health Sleep ────────────────────────────────────────────────────────────
  {
    const rows = (health.sleep ?? []).map((s: any) => ({
      user_id: userId, date: s.date, sleep_time: s.sleepTime,
      wake_time: s.wakeTime, total_minutes: s.totalMinutes,
      quality: s.quality, energy_level: s.energyLevel ?? null, notes: s.notes ?? null,
    }));
    const r = await safeInsert('health_sleep', rows, { onConflict: 'user_id,date' });
    if (r.error) errors.sleep = r.error; else details.sleep = r.count;
  }

  // ── Health Weight ───────────────────────────────────────────────────────────
  {
    const rows = (health.weight ?? []).map((w: any) => ({
      user_id: userId, date: w.date, weight: w.weight,
      body_fat_percent: w.bodyFatPercent ?? null, waist_cm: w.waistCm ?? null,
      notes: w.notes ?? null,
    }));
    const r = await safeInsert('health_weight', rows);
    if (r.error) errors.weight = r.error; else details.weight = r.count;
  }

  // ── Health Steps ────────────────────────────────────────────────────────────
  {
    const stepsObj: Record<string, number> = health.steps ?? {};
    const rows = Object.entries(stepsObj).map(([date, steps]) => ({
      user_id: userId, date, steps,
    }));
    const r = await safeInsert('health_steps', rows, { onConflict: 'user_id,date' });
    if (r.error) errors.steps = r.error; else details.steps = r.count;
  }

  // ── Health Goals ────────────────────────────────────────────────────────────
  {
    const rows = (health.goals ?? []).map((g: any) => ({
      user_id: userId, label: g.label, type: g.type,
      target_value: g.targetValue, unit: g.unit, deadline: g.deadline ?? null,
    }));
    const r = await safeInsert('health_goals', rows);
    if (r.error) errors.goals = r.error; else details.goals = r.count;
  }

  // ── Health Restrictions ─────────────────────────────────────────────────────
  {
    const rows = (health.restrictions ?? []).map((r: any) => ({
      user_id: userId, label: r.label, type: r.type,
      limit_value: r.limitValue, unit: r.unit, enabled: r.enabled,
    }));
    const r = await safeInsert('health_restrictions', rows);
    if (r.error) errors.restrictions = r.error; else details.restrictions = r.count;
  }

  // ── LeetCode Problems ───────────────────────────────────────────────────────
  {
    const rows = (app.problems ?? []).map((p: any) => ({
      user_id: userId, date: p.date, name: p.name, link: p.link,
      difficulty: p.difficulty, topic: p.topic, status: p.status,
      completed: p.completed, notes: p.notes ?? null, time_spent: p.timeSpent ?? null,
    }));
    const r = await safeInsert('leetcode_problems', rows);
    if (r.error) errors.problems = r.error; else details.problems = r.count;
  }

  // ── Focus Sessions ──────────────────────────────────────────────────────────
  {
    const rows = (app.focusSessions ?? []).map((s: any) => ({
      user_id: userId, date: s.date, start_time: s.startTime,
      end_time: s.endTime ?? null, duration: s.duration,
      actual_duration: s.actualDuration ?? null,
      completed: s.completed, failed: s.failed,
      task_name: s.taskName ?? null, task_tags: s.taskTags ?? null,
      growth_theme: s.growthTheme, ambience: s.ambience,
      reflection: s.reflection ?? null, mood: s.mood ?? null,
      productivity_score: s.productivityScore ?? null, mode: s.mode,
    }));
    const r = await safeInsert('focus_sessions', rows);
    if (r.error) errors.focusSessions = r.error; else details.focusSessions = r.count;
  }

  // ── Reminders ───────────────────────────────────────────────────────────────
  {
    const updatedReminders = (app.reminders ?? []).map((r: any) => ({
      ...r,
      id: ensureUUID(r.id),
    }));
    app.reminders = updatedReminders;

    const rows = updatedReminders.map((r: any) => ({
      id: r.id, 
      user_id: userId, 
      title: r.title || 'Reminder', 
      message: r.message || '',
      domain: r.domain || 'custom', 
      schedule_type: r.scheduleType || 'one-time',
      scheduled_at: r.scheduledAt || new Date().toISOString(), 
      recurrence: r.recurrence || 'none',
      status: r.status || 'active', 
      enabled: typeof r.enabled === 'boolean' ? r.enabled : true, 
      completed: typeof r.completed === 'boolean' ? r.completed : false,
      snoozed_until: r.snoozedUntil ?? null,
      last_triggered_at: r.lastTriggeredAt ?? null,
      smart_rules: r.smartRules ?? null, 
      metadata: r.metadata ?? null,
    }));
    const r = await safeInsert('reminders', rows);
    if (r.error) errors.reminders = r.error; else details.reminders = r.count;
  }

  // ── Trackers ────────────────────────────────────────────────────────────────
  {
    const trackers: any[] = app.trackers ?? [];
    let trackerCount = 0;
    const healedTrackers: any[] = [];

    for (const tracker of trackers) {
      const healedTrackerId = ensureUUID(tracker.id);
      const healedItems = (tracker.items ?? []).map((item: any) => ({
        ...item,
        id: ensureUUID(item.id),
      }));

      healedTrackers.push({
        ...tracker,
        id: healedTrackerId,
        items: healedItems,
      });

      const { data: inserted, error } = await supabase.from('trackers').insert({
        id: healedTrackerId, user_id: userId,
        title: tracker.title, description: tracker.description ?? null,
        icon: tracker.icon, color: tracker.color,
        type: tracker.type, category: tracker.category ?? null,
        target: tracker.target ?? null, unit: tracker.unit ?? null,
        metadata: tracker.metadata ?? null,
      }).select('id').single();

      if (error) {
        console.error('[Migration] tracker insert error:', error.message);
        errors.trackers = error.message;
        continue;
      }

      if (inserted && healedItems.length) {
        await supabase.from('tracker_items').insert(
          healedItems.map((item: any) => ({
            id: item.id, tracker_id: (inserted as any).id, user_id: userId,
            title: item.title, status: item.status,
            date_completed: item.dateCompleted ?? null,
            value: item.value ?? null, notes: item.notes ?? null, meta: item.meta ?? null,
          }))
        );
      }
      trackerCount++;
    }
    app.trackers = healedTrackers;
    if (!errors.trackers) details.trackers = trackerCount;
  }

  // ── Books ───────────────────────────────────────────────────────────────────
  if (app.book) {
    const book = app.book;
    const rows = [{
      user_id: userId,
      title: book.title,
      author: book.author,
      chapters: book.chapters ?? [],
      start_date: book.startDate ?? null,
      target_end_date: book.targetEndDate ?? null,
      cover_color: book.coverColor ?? '#7c3aed',
    }];
    const r = await safeInsert('books', rows);
    if (r.error) errors.books = r.error; else details.books = r.count;
  }

  // ── Achievements ────────────────────────────────────────────────────────────
  {
    const rows = (app.achievements ?? []).map((a: any) => ({
      user_id: userId,
      achievement_id: a.id,
      unlocked: a.unlocked,
      unlocked_at: a.unlockedAt ?? null,
      progress: a.progress ?? 0,
    }));
    const r = await safeInsert('achievements', rows, { onConflict: 'user_id,achievement_id' });
    if (r.error) errors.achievements = r.error; else details.achievements = r.count;
  }

  // ── Daily Activity ──────────────────────────────────────────────────────────
  {
    const rows = (app.dailyActivity ?? []).map((a: any) => ({
      user_id: userId,
      date: a.date,
      chapters_read: a.chaptersRead,
      problems_solved: a.problemsSolved,
      focus_minutes: a.focusMinutes,
      productivity_score: a.productivityScore,
    }));
    const r = await safeInsert('daily_activity', rows, { onConflict: 'user_id,date' });
    if (r.error) errors.dailyActivity = r.error; else details.dailyActivity = r.count;
  }

  // If we made changes and successfully ran some migrations, write the healed snapshots back to localStorage
  try {
    if (appRaw) {
      const parsed = JSON.parse(appRaw);
      parsed.state = { 
        ...parsed.state, 
        reminders: app.reminders, 
        trackers: app.trackers 
      };
      localStorage.setItem('dashboard-storage', JSON.stringify(parsed));
      console.log('[Migration] Successfully wrote healed UUIDs back to localStorage dashboard-storage');
    }
  } catch (e: any) {
    console.error('[Migration] Failed to write healed snapshots to localStorage:', e.message);
  }

  const success = Object.keys(errors).length === 0;
  console.log('[Migration] Done. Details:', details, '| Errors:', errors);
  return { success, details, errors };
}

/** Mark migration as done so we don't prompt again */
export function markMigrationComplete(userId: string): void {
  localStorage.setItem(`migrated-${userId}`, 'true');
}

/** Check if migration has already run for this user */
export function isMigrationDone(userId: string): boolean {
  return localStorage.getItem(`migrated-${userId}`) === 'true';
}
