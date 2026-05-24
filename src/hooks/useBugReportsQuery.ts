import { useMutation, useQuery, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import * as BugReportSvc from '../services/bugReports.service';

export const bugReportKeys = {
  all: ['bug-reports'] as const,
  list: (uid: string) => ['bug-reports', uid] as const,
};

export function useBugReports() {
  const { user } = useAuth();
  return useQuery({
    queryKey: bugReportKeys.list(user?.id ?? 'local'),
    queryFn: () => BugReportSvc.fetchBugReports(user!.id),
    enabled: !!user,
    placeholderData: [],
  });
}

export function useDeleteBugReport(): UseMutationResult<void, Error, BugReportSvc.BugReport> {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (report) => {
      await BugReportSvc.deleteBugReport(report);
    },
    onSuccess: () => {
      if (user) {
        qc.invalidateQueries({ queryKey: bugReportKeys.list(user.id) });
      }
    },
  });
}
