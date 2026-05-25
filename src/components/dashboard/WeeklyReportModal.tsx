import React, { useEffect, useMemo, useState } from 'react';
import { Download, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '../Modal';
import WeeklyIntelligenceReport from '../reports/WeeklyIntelligenceReport';
import { calculateWeeklyReport } from '../../services/reports/weeklyReportCalculator';
import { generateWeeklyReportPDF } from '../../services/reports/weeklyReportPdf';
import type { FocusSession, LeetCodeProblem, Tracker } from '../../types';
import type { WaterEntry, SleepEntry, WorkoutEntry, HealthGoal, MealEntry } from '../../types/health';
import type { WeeklyReportStats } from '../../types/report';

interface WeeklyReportModalProps {
  open: boolean;
  onClose: () => void;
  focusSessions: FocusSession[];
  problems: LeetCodeProblem[];
  waterEntries: WaterEntry[];
  sleepEntries: SleepEntry[];
  workoutEntries: WorkoutEntry[];
  bookChapters: Array<{ id?: string | number; number?: number; title?: string; completed?: boolean; dateCompleted?: string }>;
  stepsData: Record<string, number>;
  healthGoals: HealthGoal[];
  meals: MealEntry[];
  trackers: Tracker[];
  weeksAgo?: number;
}

export default function WeeklyReportModal({
  open,
  onClose,
  focusSessions,
  problems,
  waterEntries,
  sleepEntries,
  workoutEntries,
  bookChapters,
  stepsData,
  healthGoals,
  meals,
  trackers,
  weeksAgo = 0,
}: WeeklyReportModalProps) {
  const [report, setReport] = useState<WeeklyReportStats | null>(null);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [localWeeksAgo, setLocalWeeksAgo] = useState(weeksAgo);

  useEffect(() => {
    if (open) {
      setLocalWeeksAgo(weeksAgo);
    }
  }, [open, weeksAgo]);

  const last7Days = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfCurrentWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
    const startOfTargetWeek = new Date(startOfCurrentWeek);
    startOfTargetWeek.setDate(startOfTargetWeek.getDate() - localWeeksAgo * 7);

    const dates: string[] = [];
    for (let index = 0; index < 7; index += 1) {
      const value = new Date(startOfTargetWeek);
      value.setDate(value.getDate() + index);
      dates.push(format(value, 'yyyy-MM-dd'));
    }
    return dates;
  }, [localWeeksAgo]);

  const prev7Days = useMemo(() => {
    const start = new Date(`${last7Days[0]}T00:00:00`);
    const dates: string[] = [];
    for (let index = 7; index >= 1; index -= 1) {
      const value = new Date(start);
      value.setDate(value.getDate() - index);
      dates.push(format(value, 'yyyy-MM-dd'));
    }
    return dates;
  }, [last7Days]);

  useEffect(() => {
    if (!open) {
      setReport(null);
      return;
    }

    setGenerating(true);
    const timer = setTimeout(() => {
      try {
        const value = calculateWeeklyReport({
          focusSessions,
          problems,
          waterEntries,
          sleepEntries,
          workoutEntries,
          bookChapters,
          stepsData,
          healthGoals,
          last7Days,
          prev7Days,
          meals,
          trackers,
        });
        setReport(value);
      } finally {
        setGenerating(false);
      }
    }, 25);

    return () => clearTimeout(timer);
  }, [
    open,
    focusSessions,
    problems,
    waterEntries,
    sleepEntries,
    workoutEntries,
    bookChapters,
    stepsData,
    healthGoals,
    last7Days,
    prev7Days,
    meals,
    trackers,
  ]);

  const handleExport = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await generateWeeklyReportPDF(report);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-[92vw]" title="Weekly Intelligence Report">
      <div className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400 flex items-center gap-2">
              <ShieldCheck size={12} />
              Trusted Weekly Intelligence
            </div>
            <div className="text-sm text-white/40 mt-1">
              Premium report built from canonical Mani OS metrics only.
            </div>
          </div>

          {/* Premium Segment Control for Week Selection */}
          <div className="flex p-0.5 rounded-xl bg-white/[0.03] border border-white/5 backdrop-blur-md self-start md:self-center">
            {[
              { val: 1, label: 'Last Week (Completed)' },
              { val: 0, label: 'This Week (Ongoing)' },
              { val: 2, label: '2 Weeks Ago' }
            ].map((opt) => {
              const active = localWeeksAgo === opt.val;
              return (
                <button
                  key={opt.val}
                  onClick={() => setLocalWeeksAgo(opt.val)}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                    active
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-500 text-white shadow-md'
                      : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleExport}
            disabled={!report || generating || exporting}
            className="btn-glow px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-2 disabled:opacity-40 self-end md:self-center"
          >
            <Download size={14} />
            {exporting ? 'Exporting...' : 'Download PDF'}
          </button>
        </div>

        {generating || !report ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-t-transparent border-cyan-400 animate-spin" />
            <div className="text-xs font-black uppercase tracking-[0.25em] text-white/40">Building your weekly intelligence report</div>
          </div>
        ) : (
          <div className="max-h-[80vh] overflow-y-auto pr-2 space-y-6">
            <WeeklyIntelligenceReport report={report} />
          </div>
        )}
      </div>
    </Modal>
  );
}
