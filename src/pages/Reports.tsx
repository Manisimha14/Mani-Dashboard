import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarRange, Clock, Eye, Download, Hourglass, 
  Sparkles, BookOpen, Code2, Flame, TrendingUp, 
  Activity, Award, Zap, BarChart3, AlertTriangle, 
  Droplet, Bed, Footprints, Dumbbell, TrendingDown, Info,
  CheckCircle2, Trash2
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
import { normalizeToLocalDateString } from '../utils/dateNormalization';
import { calculateWeeklyReport } from '../services/reports/weeklyReportCalculator';
import { generateWeeklyReportPDF } from '../services/reports/weeklyReportPdf';
import WeeklyReportModal from '../components/dashboard/WeeklyReportModal';

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
  const { deletedReports, deleteReport, userSettings } = useAppStore();
  const { mutate: updateProfile } = useUpdateProfile();
  const [countdown, setCountdown] = useState(() => getNextMondayCountdown());
  const [selectedWeeksAgo, setSelectedWeeksAgo] = useState<number | null>(null);
  const [pdfGeneratingWeek, setPdfGeneratingWeek] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'cycles' | 'trends'>('cycles');
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

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
    
    setTimeout(() => {
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
        generateWeeklyReportPDF(result, last7Days);
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
            <span className="text-[10px] font-black text-violet-400 uppercase tracking-[0.25em]">Executive Analytics Engine</span>
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase mt-1">Management Cockpit</h1>
          <p className="text-sm text-white/40 font-semibold mt-1">
            Browse rolling cycles, measure biological and productivity metrics, and download vector PDF analyses.
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
            Mani OS aggregates daily task metrics, study intervals, and health targets every Monday morning. Maintain focus and track biometrics to preserve week stats streaks.
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
            { id: 'cycles', label: '📅 Weekly Cycles', icon: CalendarRange },
            { id: 'trends', label: '📈 Trends & Insights', icon: BarChart3 }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  play('click');
                  setActiveTab(tab.id as any);
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
          {/* TAB 1: WEEKLY CYCLES */}
          {activeTab === 'cycles' && (
            <div className="space-y-8">
              {/* Ongoing Report Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-white/40">
                  <Hourglass size={16} className="text-violet-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-white/50">Ongoing Week Cycle</h3>
                </div>

                {(() => {
                  const ongoing = uiReportAggregates.find(w => w.weeksAgo === 0);
                  if (!ongoing) return null;
                  const { weeksAgo, startDateStr, endDateStr, last7Days, prev7Days, stats } = ongoing;

                  return (
                    <div 
                      className="p-6 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-600/[0.02] to-transparent relative overflow-hidden group max-w-xl"
                    >
                      <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/5 rounded-full blur-[60px] pointer-events-none" />
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 rounded text-[8px] font-black bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-wider">
                            Active Ongoing
                          </span>
                          <h4 className="text-lg font-black text-white uppercase tracking-wider mt-2.5">
                            {startDateStr} – {endDateStr}
                          </h4>
                          <p className="text-[10px] text-white/30 font-semibold uppercase mt-1">Calculates dynamically in real time</p>
                        </div>
                        {/* Interactive watch style Consistency Ring */}
                        <ConsistencyRing score={stats.focusQualityScore} />
                      </div>

                      {/* Stat badges comparison */}
                      <div className="grid grid-cols-3 gap-2 py-4 border-y border-white/5 my-4">
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
                })()}
              </div>

              {/* Completed Reports Section */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-white/40">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-white/50">Completed Weekly Reports</h3>
                </div>

                {uiReportAggregates.filter(w => w.weeksAgo > 0).length === 0 ? (
                  <div className="p-8 rounded-3xl border border-white/5 bg-white/[0.01] text-center max-w-xl">
                    <p className="text-xs text-white/40 font-semibold uppercase">No completed reports found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {uiReportAggregates.filter(w => w.weeksAgo > 0).map(({ weeksAgo, startDateStr, endDateStr, last7Days, prev7Days, weekKey, stats }) => {
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
                                Completed Cycle
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

          {/* TAB 2: TRENDS & DIAGNOSTIC INSIGHTS */}
          {activeTab === 'trends' && (
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
        </motion.div>
      </AnimatePresence>

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

