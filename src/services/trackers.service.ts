/**
 * Trackers Service — Supabase CRUD for custom trackers & tracker items.
 */
import { supabase } from '../lib/supabase';
import type { Tracker, TrackerItem } from '../types';

function rowToTracker(r: any, items: TrackerItem[] = []): Tracker {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    icon: r.icon,
    color: r.color,
    type: r.type,
    category: r.category ?? undefined,
    target: r.target ? Number(r.target) : undefined,
    unit: r.unit ?? undefined,
    items,
    createdAt: r.created_at,
    metadata: r.metadata ?? undefined,
  };
}

function rowToItem(r: any): TrackerItem {
  return {
    id: r.id,
    title: r.title ?? '',
    status: r.status === 'completed' ? 'completed' : r.status === 'skipped' ? 'skipped' : 'not_started',
    dateCompleted: r.date_completed ?? undefined,
    value: r.value ? Number(r.value) : undefined,
    notes: r.notes ?? undefined,
    meta: r.meta ?? undefined,
  };
}

function statusToDb(status: TrackerItem['status']) {
  return status === 'completed' ? 'completed' : status === 'skipped' ? 'skipped' : 'not_started';
}

export async function fetchTrackers(userId: string): Promise<Tracker[]> {
  // Fetch trackers
  const { data: trackerRows, error: tErr } = await supabase
    .from('trackers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (tErr) throw tErr;

  // Fetch items
  const { data: itemRows, error: iErr } = await supabase
    .from('tracker_items')
    .select('*')
    .eq('user_id', userId);

  if (iErr) throw iErr;

  const itemsMap: Record<string, TrackerItem[]> = {};
  for (const ir of (itemRows ?? [])) {
    if (!itemsMap[ir.tracker_id]) itemsMap[ir.tracker_id] = [];
    itemsMap[ir.tracker_id].push(rowToItem(ir));
  }

  return (trackerRows ?? []).map(tr => rowToTracker(tr, itemsMap[tr.id] ?? []));
}

export async function insertTracker(userId: string, tracker: Omit<Tracker, 'id' | 'createdAt' | 'items'> & { id?: string }): Promise<Tracker> {
  const { data, error } = await supabase
    .from('trackers')
    .insert({
      id: tracker.id || undefined,
      user_id: userId,
      title: tracker.title,
      description: tracker.description ?? null,
      icon: tracker.icon,
      color: tracker.color,
      type: tracker.type,
      category: tracker.category ?? null,
      target: tracker.target ?? null,
      unit: tracker.unit ?? null,
      metadata: tracker.metadata ?? {},
    })
    .select()
    .single();

  if (error) throw error;
  return rowToTracker(data, []);
}

export async function updateTracker(id: string, updates: Partial<Omit<Tracker, 'items'>>): Promise<void> {
  const patch: Record<string, any> = {};
  if (updates.title !== undefined)       patch.title       = updates.title;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.icon !== undefined)        patch.icon        = updates.icon;
  if (updates.color !== undefined)       patch.color       = updates.color;
  if (updates.type !== undefined)        patch.type        = updates.type;
  if (updates.category !== undefined)    patch.category    = updates.category;
  if (updates.target !== undefined)      patch.target      = updates.target;
  if (updates.unit !== undefined)        patch.unit        = updates.unit;
  if (updates.metadata !== undefined)    patch.metadata    = updates.metadata;

  const { error } = await supabase.from('trackers').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteTracker(id: string): Promise<void> {
  const { error } = await supabase.from('trackers').delete().eq('id', id);
  if (error) throw error;
}

export async function insertTrackerItem(userId: string, trackerId: string, item: Omit<TrackerItem, 'id'> & { id?: string }): Promise<TrackerItem> {
  const { data, error } = await supabase
    .from('tracker_items')
    .insert({
      id: item.id || undefined,
      tracker_id: trackerId,
      user_id: userId,
      title: item.title,
      status: statusToDb(item.status),
      date_completed: item.dateCompleted ?? null,
      value: item.value ?? null,
      notes: item.notes ?? null,
      meta: item.meta ?? {},
    })
    .select()
    .single();

  if (error) throw error;
  return rowToItem(data);
}

export async function updateTrackerItem(itemId: string, updates: Partial<TrackerItem>): Promise<void> {
  const patch: Record<string, any> = {};
  if (updates.title !== undefined)         patch.title          = updates.title;
  if (updates.status !== undefined)        patch.status         = statusToDb(updates.status);
  if (updates.dateCompleted !== undefined) patch.date_completed = updates.dateCompleted;
  if (updates.value !== undefined)         patch.value          = updates.value;
  if (updates.notes !== undefined)         patch.notes          = updates.notes;
  if (updates.meta !== undefined)          patch.meta           = updates.meta;

  const { error } = await supabase.from('tracker_items').update(patch).eq('id', itemId);
  if (error) throw error;
}

export async function deleteTrackerItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('tracker_items').delete().eq('id', itemId);
  if (error) throw error;
}
