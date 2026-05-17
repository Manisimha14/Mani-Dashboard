/**
 * LeetCode Service — Supabase CRUD for leetcode_problems.
 */
import { supabase } from '../lib/supabase';
import type { LeetCodeProblem } from '../types';

function rowToProblem(r: any): LeetCodeProblem {
  return {
    id: r.id,
    date: r.date,
    name: r.name,
    link: r.link,
    difficulty: r.difficulty,
    topic: r.topic,
    status: r.status,
    completed: r.completed,
    notes: r.notes ?? undefined,
    timeSpent: r.time_spent ?? undefined,
  };
}

export async function fetchProblems(userId: string): Promise<LeetCodeProblem[]> {
  const { data, error } = await supabase
    .from('leetcode_problems')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToProblem);
}

export async function insertProblem(
  userId: string,
  problem: Omit<LeetCodeProblem, 'id'>
): Promise<LeetCodeProblem> {
  const { data, error } = await supabase
    .from('leetcode_problems')
    .insert({
      user_id: userId,
      date: problem.date,
      name: problem.name,
      link: problem.link,
      difficulty: problem.difficulty,
      topic: problem.topic,
      status: problem.status,
      completed: problem.completed,
      notes: problem.notes ?? null,
      time_spent: problem.timeSpent ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToProblem(data);
}

export async function updateProblem(
  id: string,
  updates: Partial<LeetCodeProblem>
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.name !== undefined)      patch.name       = updates.name;
  if (updates.link !== undefined)      patch.link       = updates.link;
  if (updates.difficulty !== undefined) patch.difficulty = updates.difficulty;
  if (updates.topic !== undefined)     patch.topic      = updates.topic;
  if (updates.status !== undefined)    patch.status     = updates.status;
  if (updates.completed !== undefined) patch.completed  = updates.completed;
  if (updates.notes !== undefined)     patch.notes      = updates.notes;
  if (updates.timeSpent !== undefined) patch.time_spent = updates.timeSpent;
  const { error } = await supabase.from('leetcode_problems').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteProblem(id: string): Promise<void> {
  const { error } = await supabase.from('leetcode_problems').delete().eq('id', id);
  if (error) throw error;
}

export async function bulkInsertProblems(
  userId: string,
  problems: Omit<LeetCodeProblem, 'id'>[]
): Promise<void> {
  if (!problems.length) return;
  const { error } = await supabase.from('leetcode_problems').insert(
    problems.map(p => ({
      user_id: userId,
      date: p.date, name: p.name, link: p.link,
      difficulty: p.difficulty, topic: p.topic,
      status: p.status, completed: p.completed,
      notes: p.notes ?? null, time_spent: p.timeSpent ?? null,
    }))
  );
  if (error) throw error;
}
