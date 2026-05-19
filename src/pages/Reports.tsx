import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  CalendarRange, Clock, Eye, Download, Hourglass, 
  Sparkles, FileText, CheckCircle2, BookOpen, Code2 
} from 'lucide-react';
import { format } from 'date-fns';
import { useBook } from '../hooks/useBookQuery';
import { useProblems } from '../hooks/useLeetCodeQuery';
import { useFocusSessions } from '../hooks/useFocusQuery';
import { useHealthGoals, useWater, useSleepEntries, useWorkouts, useSteps, useMeals } from '../hooks/useHealthQuery';
import { useTrackers } from '../hooks/useTrackerQuery';
import { useSoundFX } from '../hooks/useSoundFX';
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

export default function Reports() {
  const { play } = useSoundFX();
  const [countdown, setCountdown] = useState(() => getNextMondayCountdown());
  const [selectedWeeksAgo, setSelectedWeeksAgo] = useState<number | null>(null);
  const [pdfGeneratingWeek, setPdfGeneratingWeek] = useState<number | null>(null);

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

  // Format week cycles
  const getWeekCycleInfo = (weeksAgo: number) => {
    const last7Days: string[] = [];
    const baseOffset = weeksAgo * 7;
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i - baseOffset);
      last7Days.push(format(d, 'yyyy-MM-dd'));
    }
    
    // Previous 7 days boundary for comparisons
    const prev7Days: string[] = [];
    for (let i = 13; i >= 7; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i - baseOffset);
      prev7Days.push(format(d, 'yyyy-MM-dd'));
    }

    const startDateStr = format(new Date(last7Days[0] + 'T00:00:00'), 'MMM d, yyyy');
    const endDateStr = format(new Date(last7Days[6] + 'T00:00:00'), 'MMM d, yyyy');
    
    return { last7Days, prev7Days, startDateStr, endDateStr };
  };

  // Compile list of past 6 weeks
  const pastWeeks = useMemo(() => {
    return Array.from({ length: 6 }).map((_, idx) => {
      const { last7Days, prev7Days, startDateStr, endDateStr } = getWeekCycleInfo(idx);
      return { weeksAgo: idx, last7Days, prev7Days, startDateStr, endDateStr };
    });
  }, []);

  // Compute on-the-fly summary stats for a prior week
  const getHistoricalStatsBrief = (last7Days: string[]) => {
    // 1. Focus duration
    let focusMin = 0;
    let focusSessionsCount = 0;
    focusSessions.forEach(s => {
      const dStr = normalizeToLocalDateString(s.date || s.startTime);
      if (dStr && last7Days.includes(dStr) && s.completed) {
        focusMin += s.actualDuration || s.duration;
        focusSessionsCount++;
      }
    });

    // 2. Problems solved
    let solvedCount = 0;
    problems.forEach(p => {
      const dStr = normalizeToLocalDateString(p.date);
      if (dStr && last7Days.includes(dStr) && p.completed) {
        solvedCount++;
      }
    });

    // 3. Chapters completed
    let chaptersCount = 0;
    if (book && book.chapters) {
      book.chapters.forEach((c: any) => {
        const dStr = normalizeToLocalDateString(c.dateCompleted);
        if (c.completed && dStr && last7Days.includes(dStr)) {
          chaptersCount++;
        }
      });
    }

    return { focusMin, focusSessionsCount, solvedCount, chaptersCount };
  };

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

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 max-w-6xl mx-auto space-y-8"
    >
      
      {/* Premium header block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-violet-400 uppercase tracking-[0.25em]">Analytics Console</span>
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase mt-1">Executive Weekly Reports</h1>
          <p className="text-sm text-white/40 font-semibold mt-1">
            Browse prior weekly cycles, check health and habits scorecard trends, and download offline PDF reviews.
          </p>
        </div>
      </div>

      {/* Countdown Card (World-Class Apple-Grade Dashboard UI) */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-violet-950/20 via-indigo-950/10 to-transparent border border-violet-500/15 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Glow backdrop layer */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-[80px] -z-10 pointer-events-none" />
        
        <div className="space-y-3 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20">
            <Hourglass size={12} className="text-violet-400 animate-spin" />
            <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest">Reports Dispatch</span>
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider">Next Report Synthesis</h2>
          <p className="text-xs text-white/45 font-medium leading-relaxed">
            Your personal dashboard engine compiles an executive performance summary every Monday at 00:00:00 local time. Keep tracking focus blocks, sleep durations, hydration volumes, and coding metrics to preserve your consistency streaks.
          </p>
          
          {/* Progress bar inside banner */}
          <div className="space-y-1 pt-1.5">
            <div className="flex justify-between text-[9px] font-bold text-white/40">
              <span>WEEK PROGRESS</span>
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

        {/* Live ticking digits */}
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

      {/* Historical reports log section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <CalendarRange size={16} className="text-white/40" />
          <h3 className="text-xs font-black text-white/40 uppercase tracking-widest">Available Cycles History</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pastWeeks.map(({ weeksAgo, last7Days, prev7Days, startDateStr, endDateStr }) => {
            const isCurrent = weeksAgo === 0;
            const statsBrief = getHistoricalStatsBrief(last7Days);

            return (
              <div 
                key={weeksAgo}
                className={`p-5 rounded-2xl bg-white/[0.01] hover:bg-white/[0.03] border transition-all flex flex-col justify-between gap-5 relative group ${
                  isCurrent ? 'border-violet-500/20 bg-gradient-to-br from-violet-600/[0.02] to-transparent' : 'border-white/5'
                }`}
              >
                
                {/* Active current tag */}
                {isCurrent && (
                  <span className="absolute top-4 right-4 px-2 py-0.5 rounded text-[8px] font-black bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-wider">
                    In Progress
                  </span>
                )}

                <div className="space-y-1.5">
                  <div className="text-[10px] font-black text-white/30 uppercase tracking-wider">
                    {isCurrent ? 'Current Week Cycle' : `Prior Week -${weeksAgo}`}
                  </div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider mt-0.5">
                    {startDateStr} – {endDateStr}
                  </h4>
                </div>

                {/* Grid performance mini stats */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] font-bold text-white/30 uppercase flex items-center gap-1">
                      <Clock size={8} className="text-violet-400" /> Focus
                    </span>
                    <span className="text-[10px] font-bold text-white/80">
                      {(statsBrief.focusMin / 60).toFixed(1)}h <span className="text-[8px] text-white/40 font-medium">({statsBrief.focusSessionsCount})</span>
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] font-bold text-white/30 uppercase flex items-center gap-1">
                      <Code2 size={8} className="text-cyan-400" /> Coding
                    </span>
                    <span className="text-[10px] font-bold text-white/80">
                      {statsBrief.solvedCount} solved
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] font-bold text-white/30 uppercase flex items-center gap-1">
                      <BookOpen size={8} className="text-amber-400" /> Reading
                    </span>
                    <span className="text-[10px] font-bold text-white/80">
                      {statsBrief.chaptersCount} chapters
                    </span>
                  </div>
                </div>

                {/* Double action layout */}
                <div className="flex items-center gap-3 mt-1">
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
      </div>

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
