import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarRange, Clock, Eye, Download, Hourglass, FileText,
  BookOpen, Code2, BarChart3, AlertTriangle, 
  CheckCircle2, Trash2, ArrowRight, Droplets, TimerReset, HeartPulse
} from 'lucide-react';
import { format } from 'date-fns';
import { useBook } from '../hooks/useBookQuery';
import { useProblems } from '../hooks/useLeetCodeQuery';
import { useFocusSessions } from '../hooks/useFocusQuery';
import { useHealthGoals, useWater, useSleepEntries, useWorkouts, useSteps, useMeals } from '../hooks/useHealthQuery';
import { useTrackers } from '../hooks/useTrackerQuery';
import { useSoundFX } from '../hooks/useSoundFX';
import { useAppStore } from '../store/useAppStore';
import { useUpdateProfile } from '../hooks/useProfileQuery';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { calculateWeeklyReport } from '../services/reports/weeklyReportCalculator';
import { generateWeeklyReportPDF } from '../services/reports/weeklyReportPdf';
import WeeklyReportModal from '../components/dashboard/WeeklyReportModal';
import Modal from '../components/Modal';
import { exportToJSON, formatDate, todayString } from '../lib/utils';
import { useBugReports, useDeleteBugReport } from '../hooks/useBugReportsQuery';
import type { BugReport } from '../services/bugReports.service';

type ReportTab = 'weekly' | 'analytics' | 'bugs';
type BugArtifactType = 'intelligence' | 'digest' | 'export';

interface BugArtifact {
  id: string;
  type: BugArtifactType;
  title: string;
  subtitle: string;
  summary: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

// Helper for local-first countdown target matching Monday 00:00:00 local time
const getNextMondayCountdown = () => {
  const now = new Date();
  const day = now.getDay();
  // If Sunday (0), next is 1 day. If Monday (1) and time is active, next is 7 days.
  const daysToNextMonday = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysToNextMonday,
    0, 0, 0, 0
  );
  const diff = nextMonday.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, totalMs: diff };
};

// Premium Apple-Watch Style consistency ring
const ConsistencyRing = ({ score }: { score: number }) => {
  const radius = 22;
  const stroke = 3.5;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0">
      <svg
        height={radius * 2}
        width={radius * 2}
        className="transform -rotate-90 filter drop-shadow-[0_0_4px_rgba(139,92,246,0.15)]"
      >
        <circle
          stroke="rgba(255,255,255,0.03)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="url(#consistencyGradient)"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <defs>
          <linearGradient id="consistencyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute text-[9px] font-black text-white/90">{score}%</span>
    </div>
  );
};

export default function Reports() {
  const { play } = useSoundFX();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { deletedReports, deleteReport, userSettings } = useAppStore();
  const { mutate: updateProfile } = useUpdateProfile();
  const { data: bugReports = [] } = useBugReports();
  const { mutate: deleteBugReport } = useDeleteBugReport();
  const [countdown, setCountdown] = useState(() => getNextMondayCountdown());
  const [selectedWeeksAgo, setSelectedWeeksAgo] = useState<number | null>(null);
  const [pdfGeneratingWeek, setPdfGeneratingWeek] = useState<number | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [selectedBugArtifact, setSelectedBugArtifact] = useState<BugArtifact | null>(null);
  const [selectedBugReport, setSelectedBugReport] = useState<BugReport | null>(null);
  const [dismissedBugArtifacts, setDismissedBugArtifacts] = useState<string[]>([]);
  const activeTab = (searchParams.get('tab') as ReportTab) || 'weekly';
  const setActiveTab = (tab: ReportTab) => {
    setSearchParams({ tab });
  };

  // Queries for data streams to support instant calculations
  const { data: book = { id: 'main-book', title: 'My Book', author: 'Author', chapters: [], startDate: '', coverColor: '#7c3aed' } } = useBook();
  const { data: problems = [] } = useProblems();
  const { data: focusSessions = [] } = useFocusSessions();
  const { data: healthGoals = [] } = useHealthGoals();
  const { data: waterEntries = [] } = useWater();
  const { data: sleepEntries = [] } = useSleepEntries();
  const { data: workoutEntries = [] } = useWorkouts();
  const { data: stepsData = {} } = useSteps();
  const { data: meals = [] } = useMeals();
  const { data: trackers = [] } = useTrackers();

  // Tick countdown every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getNextMondayCountdown());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleConfirmDelete = () => {
    if (confirmDeleteKey) {
      deleteReport(confirmDeleteKey);
      updateProfile({
        settings: {
          ...userSettings,
          deletedReports: [...deletedReports, confirmDeleteKey]
        }
      });
      setConfirmDeleteKey(null);
      play('success');
    }
  };

  // Format week cycles
  const getWeekCycleInfo = (weeksAgo: number) => {
    const now = new Date();
    const currentDay = now.getDay();
    // Monday is index 1. Sunday is 0.
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;

    // Start of the current week (Monday)
    const startOfCurrentWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);

    // Offset to the target week
    const startOfTargetWeek = new Date(startOfCurrentWeek);
    startOfTargetWeek.setDate(startOfTargetWeek.getDate() - weeksAgo * 7);

    const last7Days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfTargetWeek);
      d.setDate(d.getDate() + i);
      last7Days.push(format(d, 'yyyy-MM-dd'));
    }

    const prev7Days: string[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(startOfTargetWeek);
      d.setDate(d.getDate() - i);
      prev7Days.unshift(format(d, 'yyyy-MM-dd'));
    }

    const startDateStr = format(new Date(last7Days[0] + 'T00:00:00'), 'MMM d');
    const endDateStr = format(new Date(last7Days[6] + 'T00:00:00'), 'MMM d');

    return { last7Days, prev7Days, startDateStr, endDateStr };
  };

  // Compile list of weeks for UI report cards (filtered by deletedReports, up to 5 completed + ongoing)
  const uiReportWeeks = useMemo(() => {
    const generated = Array.from({ length: 20 }).map((_, idx) => {
      const { last7Days, prev7Days, startDateStr, endDateStr } = getWeekCycleInfo(idx);
      const weekKey = `${last7Days[0]}_${last7Days[6]}`;
      return { weeksAgo: idx, last7Days, prev7Days, startDateStr, endDateStr, weekKey };
    });

    const ongoingWeek = generated.find(w => w.weeksAgo === 0)!;
    const completedWeeks = generated.filter(w => w.weeksAgo > 0);

    // Filter out deleted completed reports
    const activeCompletedWeeks = completedWeeks.filter(w => !deletedReports.includes(w.weekKey));

    // Limit to the last 5 completed reports
    const limitedCompletedWeeks = activeCompletedWeeks.slice(0, 5);

    return [ongoingWeek, ...limitedCompletedWeeks];
  }, [deletedReports]);

  // Compile calculated aggregates for each of the UI report weeks (filtered)
  const uiReportAggregates = useMemo(() => {
    return uiReportWeeks.map(({ weeksAgo, last7Days, prev7Days, startDateStr, endDateStr, weekKey }) => {
      const stats = calculateWeeklyReport({
        focusSessions,
        problems,
        waterEntries,
        sleepEntries,
        workoutEntries,
        bookChapters: book?.chapters ?? [],
        stepsData,
        healthGoals,
        last7Days,
        prev7Days,
        meals,
        trackers
      });
      return {
        weeksAgo,
        startDateStr,
        endDateStr,
        last7Days,
        prev7Days,
        weekKey,
        stats
      };
    });
  }, [uiReportWeeks, focusSessions, problems, waterEntries, sleepEntries, workoutEntries, book, stepsData, healthGoals, meals, trackers]);

  const hasValidatedSignal = (stats: ReturnType<typeof calculateWeeklyReport>) => (
    stats.focusMinutes > 0 ||
    stats.problemsSolved > 0 ||
    stats.chaptersRead > 0 ||
    stats.totalWaterIntakeMl > 0 ||
    stats.totalCaloriesTaken > 0 ||
    stats.totalCaloriesBurnt > 0 ||
    stats.workoutCount > 0 ||
    stats.stepsAverage > 0 ||
    Number(stats.sleepAverageH) > 0
  );

  // Compile list of past weeks for analytics charts (always rolling 6 weeks, unfiltered by deletedReports)
  const analyticsWeeks = useMemo(() => {
    return Array.from({ length: 6 }).map((_, idx) => {
      const { last7Days, prev7Days, startDateStr, endDateStr } = getWeekCycleInfo(idx);
      const weekKey = `${last7Days[0]}_${last7Days[6]}`;
      return { weeksAgo: idx, last7Days, prev7Days, startDateStr, endDateStr, weekKey };
    });
  }, []);

  // Compile calculated aggregates for each of the weeks for analytics (unfiltered by deletedReports)
  const weeklyAggregates = useMemo(() => {
    return analyticsWeeks.map(({ weeksAgo, last7Days, prev7Days, startDateStr, endDateStr, weekKey }) => {
      const stats = calculateWeeklyReport({
        focusSessions,
        problems,
        waterEntries,
        sleepEntries,
        workoutEntries,
        bookChapters: book?.chapters ?? [],
        stepsData,
        healthGoals,
        last7Days,
        prev7Days,
        meals,
        trackers
      });
      return {
        weeksAgo,
        startDateStr,
        endDateStr,
        last7Days,
        prev7Days,
        weekKey,
        stats
      };
    });
  }, [analyticsWeeks, focusSessions, problems, waterEntries, sleepEntries, workoutEntries, book, stepsData, healthGoals, meals, trackers]);



  // Programmatic direct PDF compiler without modal overlays
  const triggerPdfGeneration = (weeksAgo: number, last7Days: string[], prev7Days: string[]) => {
    play('click');
    setPdfGeneratingWeek(weeksAgo);
    
    setTimeout(async () => {
      try {
        const result = calculateWeeklyReport({
          focusSessions,
          problems,
          waterEntries,
          sleepEntries,
          workoutEntries,
          bookChapters: book?.chapters ?? [],
          stepsData,
          healthGoals,
          last7Days,
          prev7Days,
          meals,
          trackers
        });
        await generateWeeklyReportPDF(result);
      } catch (err) {
        console.error('Failed to generate offline PDF report:', err);
      } finally {
        setPdfGeneratingWeek(null);
      }
    }, 200);
  };

  // Total weekly complete fraction (approx. 7 days countdown)
  const weekProgressPct = useMemo(() => {
    const totalWeekMs = 7 * 24 * 60 * 60 * 1000;
    const remainingMs = countdown.totalMs;
    const completedMs = Math.max(0, totalWeekMs - remainingMs);
    return Math.round((completedMs / totalWeekMs) * 100);
  }, [countdown]);

  // Find max values to normalize vertical trends heights
  const maxWeeklyFocus = Math.max(...weeklyAggregates.map(w => w.stats.focusMinutes / 60), 1);
  const maxWeeklyCoding = Math.max(...weeklyAggregates.map(w => w.stats.problemsSolved), 1);
  const maxWeeklyReading = Math.max(...weeklyAggregates.map(w => w.stats.chaptersRead), 1);

  // Chronological order for graphs (oldest first)
  const chronologicalWeeks = useMemo(() => {
    return [...weeklyAggregates].reverse();
  }, [weeklyAggregates]);

  const activeWeek = uiReportAggregates.find((item) => item.weeksAgo === 0);
  const completedReportCards = uiReportAggregates.filter((item) => item.weeksAgo > 0 && hasValidatedSignal(item.stats));

  const bugArtifacts = useMemo<BugArtifact[]>(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const openIssues = bugReports.filter((report) => ['open', 'triaged', 'in_progress'].includes(report.status));
    const weeklyReports = bugReports.filter((report) => new Date(report.created_at) >= sevenDaysAgo);
    const latest = bugReports[0];
    const latestDateLabel = latest ? format(new Date(latest.created_at), 'MMMM d') : format(now, 'MMMM d');

    const totalByStatus = {
      open: bugReports.filter((report) => report.status === 'open').length,
      triaged: bugReports.filter((report) => report.status === 'triaged').length,
      in_progress: bugReports.filter((report) => report.status === 'in_progress').length,
      fixed: bugReports.filter((report) => report.status === 'fixed').length,
      closed: bugReports.filter((report) => report.status === 'closed').length,
    };

    return [
      {
        id: 'bug-intelligence',
        type: 'intelligence',
        title: `Bug Intelligence Report — ${latestDateLabel}`,
        subtitle: latest ? `${latest.type} • ${latest.severity} • ${formatDate(latest.created_at)}` : 'No bug reports recorded yet.',
        summary: latest
          ? latest.title
          : 'This report will populate once the first bug report is filed.',
        createdAt: latest?.created_at ?? now.toISOString(),
        payload: {
          latest,
          totalReports: bugReports.length,
          openIssues: openIssues.length,
          statusBreakdown: totalByStatus,
          recentTitles: bugReports.slice(0, 5).map((report) => ({
            id: report.id,
            title: report.title,
            type: report.type,
            severity: report.severity,
            status: report.status,
            created_at: report.created_at,
          })),
        },
      },
      {
        id: 'weekly-qa-digest',
        type: 'digest',
        title: 'Weekly QA Digest',
        subtitle: `${weeklyReports.length} issue${weeklyReports.length === 1 ? '' : 's'} filed in the last 7 days`,
        summary: weeklyReports.length
          ? `${weeklyReports.filter((report) => report.status === 'open').length} open, ${weeklyReports.filter((report) => report.status === 'fixed').length} fixed.`
          : 'No QA activity recorded in the current week.',
        createdAt: now.toISOString(),
        payload: {
          range: {
            start: sevenDaysAgo.toISOString(),
            end: now.toISOString(),
          },
          reports: weeklyReports,
          counts: {
            open: weeklyReports.filter((report) => report.status === 'open').length,
            triaged: weeklyReports.filter((report) => report.status === 'triaged').length,
            in_progress: weeklyReports.filter((report) => report.status === 'in_progress').length,
            fixed: weeklyReports.filter((report) => report.status === 'fixed').length,
            closed: weeklyReports.filter((report) => report.status === 'closed').length,
          },
        },
      },
      {
        id: 'open-issues-export',
        type: 'export',
        title: 'Open Issues Export',
        subtitle: `${openIssues.length} actionable issue${openIssues.length === 1 ? '' : 's'}`,
        summary: openIssues.length
          ? 'Ready for export, sharing, or triage.'
          : 'No open issues currently require export.',
        createdAt: now.toISOString(),
        payload: {
          generatedAt: now.toISOString(),
          openIssues,
          totalOpenIssues: openIssues.length,
        },
      },
    ];
  }, [bugReports]);

  const visibleBugArtifacts = bugArtifacts.filter((artifact) => !dismissedBugArtifacts.includes(artifact.id));
  const openBugReports = bugReports.filter((report) => ['open', 'triaged', 'in_progress'].includes(report.status));
  const bugStatusCounts = useMemo(() => ({
    total: bugReports.length,
    open: openBugReports.length,
    fixed: bugReports.filter((report) => report.status === 'fixed').length,
  }), [bugReports, openBugReports]);

  const smartActions = useMemo(() => {
    const stats = activeWeek?.stats;
    if (!stats) return [];

    return [
      stats.focusMinutes === 0
        ? { id: 'focus', label: 'Resume focus session', detail: 'No completed focus block logged yet this week.', icon: TimerReset, onClick: () => navigate('/focus') }
        : null,
      stats.chaptersRead === 0
        ? { id: 'reading', label: 'Continue book', detail: 'Reading progress is still at zero for this cycle.', icon: BookOpen, onClick: () => navigate('/reading') }
        : null,
      stats.problemsSolved === 0
        ? { id: 'coding', label: 'Log coding progress', detail: 'No validated coding solves recorded this week.', icon: Code2, onClick: () => navigate('/leetcode') }
        : null,
      stats.waterDaysHit < 3
        ? { id: 'hydration', label: 'Improve hydration', detail: `Target hit on ${stats.waterDaysHit}/7 days so far.`, icon: Droplets, onClick: () => navigate('/health') }
        : null,
      {
        id: 'report',
        label: 'Review weekly intelligence',
        detail: 'Open the current cycle with traceable metrics and deltas.',
        icon: BarChart3,
        onClick: () => setSelectedWeeksAgo(0),
      },
      {
        id: 'health',
        label: 'Check recovery signals',
        detail: `Sleep avg ${stats.sleepAverageH}h. Validate recovery before pushing output.`,
        icon: HeartPulse,
        onClick: () => navigate('/health'),
      },
    ].filter(Boolean).slice(0, 4) as Array<{ id: string; label: string; detail: string; icon: typeof BarChart3; onClick: () => void }>;
  }, [activeWeek, navigate]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 max-w-6xl mx-auto space-y-8"
    >
      {/* Premium title banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-violet-400 uppercase tracking-[0.25em]">Weekly Review</span>
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase mt-1">Trustworthy Weekly Intelligence</h1>
          <p className="text-sm text-white/40 font-semibold mt-1">
            Every visible number is derived from canonical logs. Empty weeks are withheld instead of dressed up.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-5">
        <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <ArrowRight size={14} className="text-violet-400" />
            <span className="text-[10px] font-black text-violet-300 uppercase tracking-[0.22em]">Smart Action Strip</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {smartActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => {
                    play('click');
                    action.onClick();
                  }}
                  className="text-left p-4 rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/6 hover:border-violet-500/30 hover:bg-violet-500/[0.05] transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-white">
                        <Icon size={14} className="text-violet-400" />
                        <span className="text-sm font-black tracking-tight">{action.label}</span>
                      </div>
                      <p className="text-xs text-white/40 font-semibold leading-relaxed">{action.detail}</p>
                    </div>
                    <ArrowRight size={14} className="text-white/25 group-hover:text-violet-300 transition-colors shrink-0 mt-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-gradient-to-br from-violet-950/20 via-indigo-950/10 to-transparent border border-violet-500/15">
          <div className="text-[10px] font-black text-violet-300 uppercase tracking-[0.22em]">Scoring Logic</div>
          <h2 className="text-lg font-black text-white mt-2">Weekly performance score is target-based, not decorative.</h2>
          <p className="text-xs text-white/45 font-semibold leading-relaxed mt-2">
            The score is derived from focus quality, coding volume, sleep, hydration, steps, and workouts against weekly targets. Missing data stays missing and reduces certainty.
          </p>
        </div>
      </div>



      {/* Countdown Card (Next Report Synthesis) */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-violet-950/20 via-indigo-950/10 to-transparent border border-violet-500/15 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-[80px] -z-10 pointer-events-none" />
        
        <div className="space-y-3 max-w-lg w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20">
            <Hourglass size={12} className="text-violet-400 animate-spin" />
            <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest">Report Compiler</span>
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider">Cycle Synchronization</h2>
          <p className="text-xs text-white/45 font-semibold leading-relaxed">
            Mani OS rebuilds each weekly report from validated activity logs every Monday morning. No simulated values, no stale cached snapshots.
          </p>
          
          <div className="space-y-1 pt-1.5">
            <div className="flex justify-between text-[9px] font-bold text-white/40">
              <span>WEEK ELAPSED PROGRESS</span>
              <span>{weekProgressPct}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full" 
                style={{ width: `${weekProgressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Countdown display */}
        <div className="grid grid-cols-4 gap-2.5 sm:gap-4 text-center shrink-0 w-full md:w-auto">
          {[
            { label: 'Days', val: countdown.days },
            { label: 'Hours', val: countdown.hours },
            { label: 'Minutes', val: countdown.minutes },
            { label: 'Seconds', val: countdown.seconds }
          ].map((item, index) => (
            <div key={index} className="p-3 sm:p-4 min-w-[70px] sm:min-w-[85px] rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center hover:bg-white/[0.04] transition-all">
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight tabular-nums">
                {String(item.val).padStart(2, '0')}
              </span>
              <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-1.5">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Segmented Tab Bar Switcher */}
      <div className="flex items-center justify-center md:justify-start">
        <div className="flex gap-1.5 p-1.5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md w-full max-w-2xl overflow-x-auto">
          {[
            { id: 'weekly', label: 'Weekly Reports', icon: CalendarRange },
            { id: 'analytics', label: 'Analytics Reports', icon: BarChart3 },
            { id: 'bugs', label: 'Bug Reports', icon: AlertTriangle }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  play('click');
                  setActiveTab(tab.id as ReportTab);
                }}
                className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all whitespace-nowrap ${
                  active 
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-500/10' 
                    : 'text-white/50 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Switchable Views with Framer Motion transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
        >
          {/* TAB 1: WEEKLY REPORTS */}
          {activeTab === 'weekly' && (
            <div className="space-y-8">
              {/* Primary Section: Latest Completed Report and Ongoing Report side-by-side */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Prominent Left: Latest Completed Report */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center gap-2 text-white/40">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-white/50">Latest Completed Report</h3>
                  </div>

                  {(() => {
                    const latestCompleted = completedReportCards[0];
                    if (!latestCompleted) {
                      return (
                        <div className="p-8 rounded-3xl border border-white/5 bg-white/[0.01] text-center h-[230px] flex flex-col items-center justify-center">
                          <p className="text-xs text-white/40 font-semibold uppercase">No completed weeks with validated activity yet.</p>
                          <p className="text-[11px] text-white/20 mt-2">Complete tasks, study sessions and workouts to compile your first report cycle.</p>
                        </div>
                      );
                    }
                    const { weeksAgo, startDateStr, endDateStr, last7Days, prev7Days, weekKey, stats } = latestCompleted;
                    return (
                      <div className="p-6 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-600/[0.02] to-transparent relative overflow-hidden group shadow-lg flex flex-col justify-between h-[230px]">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 rounded-full blur-[80px] pointer-events-none" />
                        
                        {/* Hover Trash Delete button */}
                        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                          <button
                            onClick={() => {
                              play('click');
                              setConfirmDeleteKey(weekKey);
                            }}
                            className="p-2 rounded-xl bg-white/[0.02] hover:bg-red-500/10 text-white/40 hover:text-red-400 border border-white/5 hover:border-red-500/20 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Delete Report"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {/* Beautiful Glassmorphic Absolute Confirmation Overlay */}
                        <AnimatePresence>
                          {confirmDeleteKey === weekKey && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md rounded-3xl p-5 flex flex-col justify-between z-20 border border-red-500/30"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-red-400">
                                  <AlertTriangle size={14} />
                                  <span className="text-[9px] font-black uppercase tracking-widest">Delete Report?</span>
                                </div>
                                <p className="text-[11px] text-white/70 font-semibold leading-relaxed">
                                  Are you sure you want to delete this weekly report card from the list? (This will not affect your historical trend charts.)
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    play('click');
                                    setConfirmDeleteKey(null);
                                  }}
                                  className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-black uppercase tracking-wider transition-all"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => {
                                    play('error');
                                    deleteReport(weekKey);
                                    setConfirmDeleteKey(null);
                                  }}
                                  className="flex-1 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/25 text-xs font-black uppercase tracking-wider transition-all"
                                >
                                  Delete
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded text-[8px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                              Completed Cycle
                            </span>
                            <h4 className="text-xl font-black text-white uppercase tracking-wider mt-2">
                              {startDateStr} – {endDateStr}
                            </h4>
                            <p className="text-[11px] text-white/45 font-medium">Fully synthesized with canonical OS metrics & deltas</p>
                          </div>
                          <ConsistencyRing score={stats.focusQualityScore} />
                        </div>

                        {/* Stat badges comparison */}
                        <div className="grid grid-cols-3 gap-4 py-3 border-y border-white/5 my-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[8px] font-bold text-white/30 uppercase flex items-center gap-1">
                              <Clock size={8} className="text-violet-400" /> Focus
                            </span>
                            <span className="text-[13px] font-black text-white">
                              {(stats.focusMinutes / 60).toFixed(1)}h <span className="text-[9px] text-white/40 font-semibold">({stats.completedSessions}s)</span>
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[8px] font-bold text-white/30 uppercase flex items-center gap-1">
                              <Code2 size={8} className="text-cyan-400" /> Code
                            </span>
                            <span className="text-[13px] font-black text-white">
                              {stats.problemsSolved} solved
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[8px] font-bold text-white/30 uppercase flex items-center gap-1">
                              <BookOpen size={8} className="text-amber-400" /> Study
                            </span>
                            <span className="text-[13px] font-black text-white">
                              {stats.chaptersRead} chapters
                            </span>
                          </div>
                        </div>

                        {/* Double button layout */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              play('click');
                              setSelectedWeeksAgo(weeksAgo);
                            }}
                            className="flex-1 btn-glow py-2 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                          >
                            <Eye size={12} /> View Report
                          </button>
                          <button
                            onClick={() => triggerPdfGeneration(weeksAgo, last7Days, prev7Days)}
                            disabled={pdfGeneratingWeek === weeksAgo}
                            className="flex-1 btn-ghost py-2 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-40"
                          >
                            {pdfGeneratingWeek === weeksAgo ? (
                              <span className="w-3 h-3 rounded-full border-2 border-t-transparent border-white animate-spin" />
                            ) : (
                              <>
                                <Download size={12} /> Export PDF
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Right: Ongoing Cycle Report */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-white/40">
                    <Hourglass size={16} className="text-violet-400 animate-spin" style={{ animationDuration: '4s' }} />
                    <h3 className="text-xs font-black uppercase tracking-widest text-white/50">Ongoing Cycle</h3>
                  </div>

                  {(() => {
                    const ongoing = uiReportAggregates.find(w => w.weeksAgo === 0);
                    if (!ongoing) return null;
                    const { weeksAgo, startDateStr, endDateStr, last7Days, prev7Days, stats } = ongoing;

                    return (
                      <div className="p-6 rounded-3xl border border-violet-500/15 bg-white/[0.01] hover:bg-white/[0.02] transition-all relative overflow-hidden group h-[230px] flex flex-col justify-between shadow-lg">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 rounded-full blur-[40px] pointer-events-none" />
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded text-[8px] font-black bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-wider">
                              In Progress
                            </span>
                            <h4 className="text-lg font-black text-white uppercase tracking-wider mt-2">
                              {startDateStr} – {endDateStr}
                            </h4>
                            <p className="text-[10px] text-white/30 font-semibold uppercase mt-0.5">Real-time compilation</p>
                          </div>
                          <ConsistencyRing score={stats.focusQualityScore} />
                        </div>

                        {/* Stat badges comparison */}
                        <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5 my-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[8px] font-bold text-white/30 uppercase">Focus</span>
                            <span className="text-[11px] font-bold text-white/80">
                              {(stats.focusMinutes / 60).toFixed(1)}h
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[8px] font-bold text-white/30 uppercase">Code</span>
                            <span className="text-[11px] font-bold text-white/80">
                              {stats.problemsSolved} slv
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[8px] font-bold text-white/30 uppercase">Read</span>
                            <span className="text-[11px] font-bold text-white/80">
                              {stats.chaptersRead} ch
                            </span>
                          </div>
                        </div>

                        {/* Double button layout */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              play('click');
                              setSelectedWeeksAgo(weeksAgo);
                            }}
                            className="flex-1 btn-glow py-2 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                          >
                            <Eye size={12} /> View
                          </button>
                          <button
                            onClick={() => triggerPdfGeneration(weeksAgo, last7Days, prev7Days)}
                            disabled={pdfGeneratingWeek === weeksAgo}
                            className="flex-1 btn-ghost py-2 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-40"
                          >
                            {pdfGeneratingWeek === weeksAgo ? (
                              <span className="w-3 h-3 rounded-full border-2 border-t-transparent border-white animate-spin" />
                            ) : (
                              <>
                                <Download size={12} /> Export
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </div>

              {/* Completed Reports Section */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-white/40">
                  <CalendarRange size={16} className="text-violet-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-white/50">Other Completed Cycles</h3>
                </div>

                {completedReportCards.filter((_, idx) => idx > 0).length === 0 ? (
                  <div className="p-8 rounded-3xl border border-white/5 bg-white/[0.01] text-center max-w-xl">
                    <p className="text-xs text-white/40 font-semibold uppercase">No older completed weekly reports found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {completedReportCards.filter((_, idx) => idx > 0).map(({ weeksAgo, startDateStr, endDateStr, last7Days, prev7Days, weekKey, stats }) => {
                      return (
                        <div 
                          key={weeksAgo}
                          className="p-5 rounded-3xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 transition-all flex flex-col justify-between gap-5 relative group"
                        >
                          {/* Hover Trash Delete button */}
                          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                            <button
                              onClick={() => {
                                play('click');
                                setConfirmDeleteKey(weekKey);
                              }}
                              className="p-2 rounded-xl bg-white/[0.02] hover:bg-red-500/10 text-white/40 hover:text-red-400 border border-white/5 hover:border-red-500/20 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Delete Report"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          {/* Beautiful Glassmorphic Absolute Confirmation Overlay */}
                          <AnimatePresence>
                            {confirmDeleteKey === weekKey && (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md rounded-3xl p-5 flex flex-col justify-between z-20 border border-red-500/30"
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-red-400">
                                    <AlertTriangle size={14} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Delete Report?</span>
                                  </div>
                                  <p className="text-[11px] text-white/70 font-semibold leading-relaxed">
                                    Are you sure you want to delete this weekly report card from the list? (This will not affect your historical trend charts.)
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      play('click');
                                      setConfirmDeleteKey(null);
                                    }}
                                    className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-black uppercase tracking-wider transition-all"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => {
                                      play('error');
                                      deleteReport(weekKey);
                                      setConfirmDeleteKey(null);
                                    }}
                                    className="flex-1 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/25 text-xs font-black uppercase tracking-wider transition-all"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <div className="text-[10px] font-black text-white/30 uppercase tracking-wider">
                                Completed Report
                              </div>
                              <h4 className="text-base font-black text-white uppercase tracking-wider mt-0.5">
                                {startDateStr} – {endDateStr}
                              </h4>
                            </div>
                            {/* Interactive watch style Consistency Ring */}
                            <ConsistencyRing score={stats.focusQualityScore} />
                          </div>

                          {/* Stat badges comparison */}
                          <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] font-bold text-white/30 uppercase flex items-center gap-1">
                                <Clock size={8} className="text-violet-400" /> Focus
                              </span>
                              <span className="text-[11px] font-bold text-white/80">
                                {(stats.focusMinutes / 60).toFixed(1)}h <span className="text-[8px] text-white/40">({stats.completedSessions}s)</span>
                              </span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] font-bold text-white/30 uppercase flex items-center gap-1">
                                <Code2 size={8} className="text-cyan-400" /> Code
                              </span>
                              <span className="text-[11px] font-bold text-white/80">
                                {stats.problemsSolved} solved
                              </span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] font-bold text-white/30 uppercase flex items-center gap-1">
                                <BookOpen size={8} className="text-amber-400" /> Reading
                              </span>
                              <span className="text-[11px] font-bold text-white/80">
                                {stats.chaptersRead} ch
                              </span>
                            </div>
                          </div>

                          {/* Double button layout */}
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                play('click');
                                setSelectedWeeksAgo(weeksAgo);
                              }}
                              className="flex-1 btn-glow py-2 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                            >
                              <Eye size={12} /> View
                            </button>
                            <button
                              onClick={() => triggerPdfGeneration(weeksAgo, last7Days, prev7Days)}
                              disabled={pdfGeneratingWeek === weeksAgo}
                              className="flex-1 btn-ghost py-2 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-40"
                            >
                              {pdfGeneratingWeek === weeksAgo ? (
                                <span className="w-3 h-3 rounded-full border-2 border-t-transparent border-white animate-spin" />
                              ) : (
                                <>
                                  <Download size={12} /> Export
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ANALYTICS REPORTS */}
          {activeTab === 'analytics' && (
            <div className="space-y-8">
              {/* Custom Multi-Week Comparative Vertical Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Focus duration trend chart */}
                <div className="p-6 rounded-3xl bg-white/[0.01] border border-white/5 backdrop-blur-md space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                      <Clock size={14} className="text-violet-400" /> Focus Duration Trend
                    </h4>
                    <span className="text-[10px] font-black text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">Avg: {(weeklyAggregates.reduce((acc, w) => acc + w.stats.focusMinutes / 60, 0) / (weeklyAggregates.length || 1)).toFixed(1)}h</span>
                  </div>
                  <div className="flex items-end justify-between h-44 gap-3 pt-4 px-2">
                    {chronologicalWeeks.map((item, idx) => {
                      const val = item.stats.focusMinutes / 60;
                      const height = (val / maxWeeklyFocus) * 100;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group/bar relative">
                          <div className="absolute bottom-full mb-1.5 bg-zinc-900 border border-white/10 text-white text-[9px] font-bold py-1 px-1.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                            {val.toFixed(1)}h
                          </div>
                          <div className="w-full h-32 bg-white/[0.02] border border-white/5 rounded-lg flex items-end overflow-hidden p-0.5">
                            <div 
                              className="w-full rounded-md bg-gradient-to-t from-violet-600 to-indigo-500 transition-all duration-300"
                              style={{ height: `${Math.max(5, height)}%` }}
                            />
                          </div>
                          <span className="text-[8px] font-black text-white/30">
                            W{item.weeksAgo === 0 ? '0' : `-${item.weeksAgo}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* LeetCode Solves trend chart */}
                <div className="p-6 rounded-3xl bg-white/[0.01] border border-white/5 backdrop-blur-md space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                      <Code2 size={14} className="text-cyan-400" /> Coding Solves Trend
                    </h4>
                    <span className="text-[10px] font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">Total: {weeklyAggregates.reduce((acc, w) => acc + w.stats.problemsSolved, 0)}</span>
                  </div>
                  <div className="flex items-end justify-between h-44 gap-3 pt-4 px-2">
                    {chronologicalWeeks.map((item, idx) => {
                      const val = item.stats.problemsSolved;
                      const height = (val / maxWeeklyCoding) * 100;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group/bar relative">
                          <div className="absolute bottom-full mb-1.5 bg-zinc-900 border border-white/10 text-white text-[9px] font-bold py-1 px-1.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                            {val} solved
                          </div>
                          <div className="w-full h-32 bg-white/[0.02] border border-white/5 rounded-lg flex items-end overflow-hidden p-0.5">
                            <div 
                              className="w-full rounded-md bg-gradient-to-t from-cyan-600 to-blue-500 transition-all duration-300"
                              style={{ height: `${Math.max(5, height)}%` }}
                            />
                          </div>
                          <span className="text-[8px] font-black text-white/30">
                            W{item.weeksAgo === 0 ? '0' : `-${item.weeksAgo}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Reading chapters trend chart */}
                <div className="p-6 rounded-3xl bg-white/[0.01] border border-white/5 backdrop-blur-md space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                      <BookOpen size={14} className="text-amber-400" /> Chapters Read Trend
                    </h4>
                    <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">Total: {weeklyAggregates.reduce((acc, w) => acc + w.stats.chaptersRead, 0)}</span>
                  </div>
                  <div className="flex items-end justify-between h-44 gap-3 pt-4 px-2">
                    {chronologicalWeeks.map((item, idx) => {
                      const val = item.stats.chaptersRead;
                      const height = (val / maxWeeklyReading) * 100;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group/bar relative">
                          <div className="absolute bottom-full mb-1.5 bg-zinc-900 border border-white/10 text-white text-[9px] font-bold py-1 px-1.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                            {val} ch
                          </div>
                          <div className="w-full h-32 bg-white/[0.02] border border-white/5 rounded-lg flex items-end overflow-hidden p-0.5">
                            <div 
                              className="w-full rounded-md bg-gradient-to-t from-amber-600 to-orange-500 transition-all duration-300"
                              style={{ height: `${Math.max(5, height)}%` }}
                            />
                          </div>
                          <span className="text-[8px] font-black text-white/30">
                            W{item.weeksAgo === 0 ? '0' : `-${item.weeksAgo}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: BUG REPORTS / EXPORTS */}
          {activeTab === 'bugs' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-5">
                <div className="p-6 rounded-3xl bg-gradient-to-br from-rose-500/10 via-white/[0.02] to-transparent border border-rose-500/15">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-rose-300" />
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-200/80">Bug Reports / Exports</span>
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight mt-3">Premium issue intelligence with export-ready triage.</h2>
                  <p className="text-sm text-white/40 font-semibold leading-relaxed mt-2 max-w-2xl">
                    Review bug intelligence reports, weekly QA digest cards, and open-issue exports from the same trusted issue ledger.
                  </p>
                </div>
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Live QA Snapshot</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/30">Total</div>
                      <div className="text-2xl font-black text-white mt-2">{bugStatusCounts.total}</div>
                    </div>
                    <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/30">Open</div>
                      <div className="text-2xl font-black text-rose-300 mt-2">{bugStatusCounts.open}</div>
                    </div>
                    <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/30">Fixed</div>
                      <div className="text-2xl font-black text-emerald-300 mt-2">{bugStatusCounts.fixed}</div>
                    </div>
                  </div>
                </div>
              </div>

              {visibleBugArtifacts.length === 0 ? (
                <div className="p-8 rounded-3xl border border-white/5 bg-white/[0.01] text-center">
                  <p className="text-xs text-white/40 font-semibold uppercase">No bug report exports are visible yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {visibleBugArtifacts.map((artifact) => (
                    <div key={artifact.id} className="p-5 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.03] transition-all flex flex-col justify-between gap-4 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                      <div className="relative space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
                            {artifact.type === 'intelligence' ? 'Intelligence Report' : artifact.type === 'digest' ? 'QA Digest' : 'Open Export'}
                          </div>
                          <div className="w-2 h-2 rounded-full bg-rose-400/80 animate-pulse" />
                        </div>
                        <h3 className="text-lg font-black text-white tracking-tight">{artifact.title}</h3>
                        <p className="text-sm text-white/40 font-semibold leading-relaxed">{artifact.subtitle}</p>
                        <div className="rounded-2xl bg-black/20 border border-white/5 p-3">
                          <p className="text-xs text-white/55 font-medium leading-relaxed">{artifact.summary}</p>
                        </div>
                      </div>

                      <div className="relative grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            play('click');
                            setSelectedBugArtifact(artifact);
                          }}
                          className="py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-300 text-xs font-black uppercase tracking-wider transition-all"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            play('click');
                            exportToJSON(artifact.payload, `${artifact.id}-${todayString()}.json`);
                          }}
                          className="py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 text-xs font-black uppercase tracking-wider transition-all"
                        >
                          Download
                        </button>
                        <button
                          onClick={async () => {
                            play('click');
                            const text = `${artifact.title}\n${artifact.subtitle}\n${artifact.summary}`;
                            if (navigator.share) {
                              try {
                                await navigator.share({ title: artifact.title, text });
                              } catch {
                                // ignore share cancellation
                              }
                            } else {
                              await navigator.clipboard.writeText(text);
                            }
                          }}
                          className="py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 text-xs font-black uppercase tracking-wider transition-all"
                        >
                          Share
                        </button>
                        <button
                          onClick={() => {
                            play('click');
                            setDismissedBugArtifacts((current) => [...current, artifact.id]);
                          }}
                          className="py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-black uppercase tracking-wider transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-white/40">
                  <FileText size={16} className="text-violet-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-white/50">Recent Issue Ledger</h3>
                </div>

                {bugReports.length === 0 ? (
                  <div className="p-8 rounded-3xl border border-white/5 bg-white/[0.01] text-center">
                    <p className="text-xs text-white/40 font-semibold uppercase">No bug reports have been filed yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bugReports.map((report) => (
                      <div key={report.id} className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{report.type} • {report.severity}</div>
                            <h4 className="text-base font-black text-white mt-2">{report.title}</h4>
                            <p className="text-xs text-white/40 font-semibold mt-2 leading-relaxed">{report.description}</p>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.18em] border ${
                            report.status === 'open' ? 'bg-rose-500/10 text-rose-300 border-rose-500/20' :
                            report.status === 'fixed' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' :
                            'bg-white/5 text-white/45 border-white/10'
                          }`}>
                            {report.status}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              play('click');
                              setSelectedBugReport(report);
                            }}
                            className="py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-300 text-xs font-black uppercase tracking-wider transition-all"
                          >
                            View
                          </button>
                          <button
                            onClick={() => {
                              play('click');
                              exportToJSON(report, `bug-report-${report.id}.json`);
                            }}
                            className="py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 text-xs font-black uppercase tracking-wider transition-all"
                          >
                            Download
                          </button>
                          <button
                            onClick={async () => {
                              play('click');
                              const text = `${report.title}\n${report.type} • ${report.severity}\n${report.description}`;
                              if (navigator.share) {
                                try {
                                  await navigator.share({ title: report.title, text });
                                } catch {
                                  // ignore share cancellation
                                }
                              } else {
                                await navigator.clipboard.writeText(text);
                              }
                            }}
                            className="py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 text-xs font-black uppercase tracking-wider transition-all"
                          >
                            Share
                          </button>
                          <button
                            onClick={() => {
                              play('click');
                              deleteBugReport(report);
                            }}
                            className="py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-black uppercase tracking-wider transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <Modal
        open={!!selectedBugArtifact || !!selectedBugReport}
        onClose={() => {
          setSelectedBugArtifact(null);
          setSelectedBugReport(null);
        }}
        title={selectedBugArtifact?.title || selectedBugReport?.title || 'Bug Report'}
        maxWidth="max-w-3xl"
      >
        {selectedBugArtifact ? (
          <div className="space-y-4">
            <p className="text-sm text-white/45 font-semibold">{selectedBugArtifact.subtitle}</p>
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
              <pre className="text-[11px] text-white/60 whitespace-pre-wrap break-words font-mono">
                {JSON.stringify(selectedBugArtifact.payload, null, 2)}
              </pre>
            </div>
          </div>
        ) : selectedBugReport ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Type</div>
                <div className="text-white mt-2 font-bold">{selectedBugReport.type}</div>
              </div>
              <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Severity</div>
                <div className="text-white mt-2 font-bold">{selectedBugReport.severity}</div>
              </div>
              <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Status</div>
                <div className="text-white mt-2 font-bold">{selectedBugReport.status}</div>
              </div>
              <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Created</div>
                <div className="text-white mt-2 font-bold">{formatDate(selectedBugReport.created_at)}</div>
              </div>
            </div>
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Description</div>
              <p className="text-sm text-white/70 font-medium mt-2 leading-relaxed">{selectedBugReport.description}</p>
            </div>
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Metadata</div>
              <pre className="text-[11px] text-white/60 whitespace-pre-wrap break-words font-mono mt-2">
                {JSON.stringify(selectedBugReport.metadata, null, 2)}
              </pre>
            </div>
            {selectedBugReport.screenshot_url ? (
              <img src={selectedBugReport.screenshot_url} alt="Bug report screenshot" className="w-full rounded-2xl border border-white/5" />
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* Dynamic multi-week aggregate report viewer */}
      {selectedWeeksAgo !== null && (
        <WeeklyReportModal
          open={selectedWeeksAgo !== null}
          onClose={() => setSelectedWeeksAgo(null)}
          focusSessions={focusSessions}
          problems={problems}
          waterEntries={waterEntries}
          sleepEntries={sleepEntries}
          workoutEntries={workoutEntries}
          bookChapters={book?.chapters ?? []}
          stepsData={stepsData}
          healthGoals={healthGoals}
          meals={meals}
          trackers={trackers}
          weeksAgo={selectedWeeksAgo}
        />
      )}
    </motion.div>
  );
}
