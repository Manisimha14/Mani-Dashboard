import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, TrendingUp, ShieldAlert, Sparkles, Download, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '../Modal';

// Presentation Panels imports
import WeeklySummaryPanel from '../reports/WeeklySummaryPanel';
import TrendInsightsPanel from '../reports/TrendInsightsPanel';
import HighlightsPanel from '../reports/HighlightsPanel';
import RecommendationsPanel from '../reports/RecommendationsPanel';

// Services & Utilities imports
import { calculateWeeklyReport } from '../../services/reports/weeklyReportCalculator';
import { generateWeeklyReportPDF } from '../../services/reports/weeklyReportPdf';
import type { FocusSession, LeetCodeProblem } from '../../types';
import type { WaterEntry, SleepEntry, WorkoutEntry, HealthGoal } from '../../types/health';
import type { WeeklyReportStats } from '../../types/report';

interface WeeklyReportModalProps {
  open: boolean;
  onClose: () => void;
  focusSessions: FocusSession[];
  problems: LeetCodeProblem[];
  waterEntries: WaterEntry[];
  sleepEntries: SleepEntry[];
  workoutEntries: WorkoutEntry[];
  stepsData: Record<string, number>;
  healthGoals: HealthGoal[];
}

export default function WeeklyReportModal({
  open,
  onClose,
  focusSessions,
  problems,
  waterEntries,
  sleepEntries,
  workoutEntries,
  stepsData,
  healthGoals
}: WeeklyReportModalProps) {
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(true);
  const [stats, setStats] = useState<WeeklyReportStats | null>(null);

  // Timezone-safe 7-day sequences
  const last7Days = useMemo(() => {
    const list: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push(format(d, 'yyyy-MM-dd'));
    }
    return list;
  }, []);

  const prev7Days = useMemo(() => {
    const list: string[] = [];
    for (let i = 13; i >= 7; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      list.push(format(d, 'yyyy-MM-dd'));
    }
    return list;
  }, []);

  // Goals fallback parameters
  const resolvedGoals = useMemo(() => {
    const waterGoalMl = healthGoals.find(g => g.type === 'water')?.targetValue ?? 3000;
    const sleepGoalHours = healthGoals.find(g => g.type === 'sleep_hours')?.targetValue ?? 7.5;
    const focusGoalMin = 300;
    return { waterGoalMl, sleepGoalHours, focusGoalMin };
  }, [healthGoals]);

  // Async task loader to perform actual analytical work on the thread safely without lag spikes
  useEffect(() => {
    if (open) {
      setGenerating(true);
      setStep(0);
      
      const taskTimer = setTimeout(() => {
        try {
          const result = calculateWeeklyReport({
            focusSessions,
            problems,
            waterEntries,
            sleepEntries,
            workoutEntries,
            stepsData,
            healthGoals,
            last7Days,
            prev7Days
          });
          setStats(result);
        } catch (err) {
          console.error('Failed to calculate report metrics:', err);
        } finally {
          setGenerating(false);
        }
      }, 50); // Yield thread briefly to let loader animation mount

      return () => clearTimeout(taskTimer);
    } else {
      setStats(null);
    }
  }, [
    open,
    focusSessions,
    problems,
    waterEntries,
    sleepEntries,
    workoutEntries,
    stepsData,
    healthGoals,
    last7Days,
    prev7Days
  ]);

  // Keyboard navigation for step tab indices
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      setStep(s => Math.min(s + 1, 3));
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      setStep(s => Math.max(s - 1, 0));
      e.preventDefault();
    }
  };

  const handlePrint = () => {
    if (stats) {
      generateWeeklyReportPDF(stats, last7Days);
    }
  };

  const stepsList = [
    { title: 'Weekly Summary', icon: Briefcase },
    { title: 'Trend Insights', icon: TrendingUp },
    { title: 'Highlights & Concerns', icon: ShieldAlert },
    { title: 'Recommendations', icon: Sparkles }
  ];

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-2xl" title="Weekly Summary Report">
      <div onKeyDown={handleKeyDown} className="outline-none">
        
        {/* Loading Spinner Micro-interaction */}
        <AnimatePresence mode="wait">
          {generating || !stats ? (
            <motion.div 
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-20 flex flex-col items-center justify-center space-y-4"
            >
              <div className="w-10 h-10 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
              <div className="flex flex-col items-center text-center space-y-1">
                <span className="text-xs font-black text-white uppercase tracking-widest">Preparing Report</span>
                <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">Analyzing your weekly data...</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Tab Progress Headers (Aria compliant tablist) */}
              <div className="flex justify-between border-b border-white/5 pb-4" role="tablist" aria-label="Weekly summary sections">
                {stepsList.map((s, idx) => {
                  const Icon = s.icon;
                  const isActive = idx === step;
                  return (
                    <button
                      key={s.title}
                      role="tab"
                      id={`tab-${idx}`}
                      aria-selected={isActive}
                      aria-controls={`panel-${idx}`}
                      onClick={() => setStep(idx)}
                      className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider pb-2 border-b-2 transition-all ${
                        isActive 
                          ? 'border-violet-500 text-white'
                          : 'border-transparent text-white/40 hover:text-white/70'
                      }`}
                    >
                      <Icon size={14} />
                      <span className="hidden md:inline">{s.title}</span>
                    </button>
                  );
                })}
              </div>

              {/* Steps Tabpanel Containers */}
              <div className="space-y-6">
                {step === 0 && (
                  <div 
                    role="tabpanel" 
                    id="panel-0" 
                    aria-labelledby="tab-0"
                    tabIndex={0}
                    className="outline-none focus-visible:ring-1 focus-visible:ring-violet-500 rounded-xl"
                  >
                    <WeeklySummaryPanel 
                      stats={stats} 
                      waterGoalMl={resolvedGoals.waterGoalMl} 
                      sleepHours={resolvedGoals.sleepGoalHours} 
                      focusGoalMin={resolvedGoals.focusGoalMin} 
                    />
                  </div>
                )}

                {step === 1 && (
                  <div 
                    role="tabpanel" 
                    id="panel-1" 
                    aria-labelledby="tab-1"
                    tabIndex={0}
                    className="outline-none focus-visible:ring-1 focus-visible:ring-violet-500 rounded-xl"
                  >
                    <TrendInsightsPanel 
                      stats={stats} 
                      cycleDates={last7Days} 
                    />
                  </div>
                )}

                {step === 2 && (
                  <div 
                    role="tabpanel" 
                    id="panel-2" 
                    aria-labelledby="tab-2"
                    tabIndex={0}
                    className="outline-none focus-visible:ring-1 focus-visible:ring-violet-500 rounded-xl"
                  >
                    <HighlightsPanel stats={stats} />
                  </div>
                )}

                {step === 3 && (
                  <div 
                    role="tabpanel" 
                    id="panel-3" 
                    aria-labelledby="tab-3"
                    tabIndex={0}
                    className="outline-none focus-visible:ring-1 focus-visible:ring-violet-500 rounded-xl"
                  >
                    <RecommendationsPanel stats={stats} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Navigation Buttons */}
        <div className="border-t border-white/5 pt-4 mt-6 flex justify-between items-center">
          <button
            onClick={handlePrint}
            aria-label="Download clean vector PDF report"
            disabled={generating || !stats}
            className="btn-ghost px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-violet-400 disabled:opacity-30 disabled:pointer-events-none"
          >
            <Download size={14} /> Download PDF
          </button>
          
          <div className="flex gap-2">
            {step > 0 && !generating && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="btn-ghost px-4 py-2 text-xs font-black uppercase tracking-wider"
              >
                Back
              </button>
            )}
            {step < 3 && !generating ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="btn-glow px-5 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1"
              >
                Next <ChevronRight size={14} />
              </button>
            ) : !generating ? (
              <button
                onClick={onClose}
                className="btn-glow px-6 py-2 text-xs font-black uppercase tracking-wider"
              >
                Dismiss
              </button>
            ) : null}
          </div>
        </div>

      </div>
    </Modal>
  );
}
