/**
 * Bug Reports Service — Supabase CRUD for public.bug_reports.
 */
import { supabase } from '../lib/supabase';

export type BugReportType = 'Bug' | 'Feature Request' | 'UX Improvement' | 'Performance Issue' | 'Wrong Data Sync' | 'Other';
export type BugReportSeverity = 'Minor' | 'Medium' | 'Critical';
export type BugReportStatus = 'open' | 'triaged' | 'in_progress' | 'fixed' | 'closed';

export interface BugReport {
  id: string;
  user_id: string;
  type: BugReportType;
  severity: BugReportSeverity;
  title: string;
  description: string;
  metadata: Record<string, unknown>;
  screenshot_url: string | null;
  status: BugReportStatus;
  created_at: string;
  resolved_at: string | null;
}

function rowToBugReport(row: any): BugReport {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    severity: row.severity,
    title: row.title,
    description: row.description,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    screenshot_url: row.screenshot_url ?? null,
    status: row.status,
    created_at: row.created_at,
    resolved_at: row.resolved_at ?? null,
  };
}

export async function fetchBugReports(userId: string): Promise<BugReport[]> {
  const { data, error } = await supabase
    .from('bug_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToBugReport);
}

export async function deleteBugReport(report: BugReport): Promise<void> {
  if (report.screenshot_url) {
    const match = report.screenshot_url.match(/bug-reports\/(.*)$/);
    if (match?.[1]) {
      await supabase.storage.from('bug-reports').remove([decodeURIComponent(match[1])]);
    }
  }

  const { error } = await supabase.from('bug_reports').delete().eq('id', report.id);
  if (error) throw error;
}
