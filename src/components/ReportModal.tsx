import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { format, subDays } from 'date-fns';
import { formatDuration } from '../lib/utils';
import { useWater, useMeals, useWorkouts, useSleepEntries } from '../hooks/useHealthQuery';
import { Download } from 'lucide-react';
import Modal from '../components/Modal';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export default function ReportModal({ open, onClose }: { open: boolean, onClose: () => void }) {
  const { dailyActivity, focusSessions, problems, book, readingStreak, codingStreak, focusStreak, userSettings } = useAppStore();

  // ── Health Data Queries ──
  const { data: waterLogs = [] } = useWater();
  const { data: meals = [] } = useMeals();
  const { data: workouts = [] } = useWorkouts();
  const { data: sleepLogs = [] } = useSleepEntries();

  // Last 7 days calculations
  const weekActivity = dailyActivity.filter(a => new Date(a.date) >= subDays(new Date(), 7));
  const weekFocus = weekActivity.reduce((acc, a) => acc + a.focusMinutes, 0);
  const weekProblems = weekActivity.reduce((acc, a) => acc + a.problemsSolved, 0);
  const weekChapters = weekActivity.reduce((acc, a) => acc + a.chaptersRead, 0);

  // Health Averages
  const sevenDaysAgo = subDays(new Date(), 7);
  const recentWater = waterLogs.filter(w => new Date(w.date) >= sevenDaysAgo);
  const avgWaterL = recentWater.length ? (recentWater.reduce((a, b) => a + b.amount, 0) / 7 / 1000).toFixed(2) : '0.00';

  const recentMeals = meals.filter(m => new Date(m.date) >= sevenDaysAgo);
  const avgCalories = recentMeals.length ? Math.round(recentMeals.reduce((a, b) => a + (b.calories || 0), 0) / 7) : 0;

  const recentWorkouts = workouts.filter(w => new Date(w.date) >= sevenDaysAgo);
  const totalWorkoutMin = recentWorkouts.reduce((a, b) => a + (b.durationMinutes || 0), 0);

  const recentSleep = sleepLogs.filter(s => new Date(s.date) >= sevenDaysAgo);
  const avgSleepHrs = recentSleep.length ? (recentSleep.reduce((a, b) => a + (b.totalMinutes || 0), 0) / recentSleep.length / 60).toFixed(1) : '0.0';

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const reportHtml = `
      <div class="section-title">Productivity Summary (Last 7 Days)</div>
      <div class="grid">
        <div class="card">
          <div class="card-title">Focus Time</div>
          <div class="card-value">${escapeHtml(formatDuration(weekFocus))}</div>
        </div>
        <div class="card">
          <div class="card-title">Problems Solved</div>
          <div class="card-value">${weekProblems}</div>
        </div>
        <div class="card">
          <div class="card-title">Chapters Read</div>
          <div class="card-value">${weekChapters}</div>
        </div>
      </div>

      <div class="section-title">Health Summary (Last 7 Days)</div>
      <div class="grid">
        <div class="card">
          <div class="card-title">Hydration Avg</div>
          <div class="card-value">${avgWaterL}L/day</div>
        </div>
        <div class="card">
          <div class="card-title">Calorie Intake Avg</div>
          <div class="card-value">${avgCalories} kcal</div>
        </div>
        <div class="card">
          <div class="card-title">Workout Time</div>
          <div class="card-value">${totalWorkoutMin} min</div>
        </div>
      </div>

      <div class="section-title">Lifetime Totals</div>
      <div class="row">
        <span>Total Focus Logged</span>
        <strong>${escapeHtml(formatDuration(focusSessions.reduce((a, s) => a + (s.completed ? s.actualDuration || s.duration : 0), 0)))}</strong>
      </div>
      <div class="row">
        <span>Total Problems Solved</span>
        <strong>${problems.filter(p => p.completed).length}</strong>
      </div>
      <div class="row">
        <span>Total Chapters Completed</span>
        <strong>${book?.chapters.filter(c => c.completed).length || 0}</strong>
      </div>
      <div class="row">
        <span>Average Sleep (7d)</span>
        <strong>${avgSleepHrs} h</strong>
      </div>
      <div class="row">
        <span>Longest Active Streak</span>
        <strong>${Math.max(readingStreak.longestStreak, codingStreak.longestStreak, focusStreak.longestStreak)} days</strong>
      </div>
    `;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Life OS Summary Report</title>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Outfit', sans-serif; padding: 40px; color: #0f172a; max-width: 900px; margin: 0 auto; background: #fafafa; }
            .header { text-align: center; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #f1f5f9; }
            h1 { color: #6d28d9; margin-bottom: 8px; font-weight: 800; font-size: 36px; letter-spacing: -1.5px; }
            .subtitle { color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; }
            
            .section-title { font-size: 18px; font-weight: 800; color: #1e293b; margin: 36px 0 16px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; }
            
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
            .card { background: #ffffff; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center; }
            .card-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 8px; font-weight: 800; }
            .card-value { font-size: 32px; font-weight: 800; color: #0f172a; line-height: 1; }
            
            .row { display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px dashed #e2e8f0; font-size: 15px; }
            .row span { color: #475569; font-weight: 600; }
            .row strong { color: #0f172a; font-weight: 800; }
            .row:last-child { border: none; }
            
            .badge { display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 800; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
            .badge-success { background: #dcfce7; color: #15803d; }
            
            @media print {
              body { padding: 0; background: #ffffff; }
              .no-print { display: none; }
              .card { border: 2px solid #e2e8f0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Life OS Summary</h1>
            <div class="subtitle">Weekly productivity and health totals</div>
            <div style="margin-top: 10px; font-size: 12px; color: #94a3b8; font-weight: 600;">Subject: ${escapeHtml(userSettings.name || 'Member')} • Generated on ${format(new Date(), 'MMMM d, yyyy')}</div>
          </div>
          ${reportHtml}
          <div class="no-print" style="margin-top: 50px; text-align: center;">
            <button onclick="window.print()" style="background: #8b5cf6; color: white; border: none; padding: 14px 28px; border-radius: 12px; cursor: pointer; font-weight: 800; font-size: 16px; box-shadow: 0 4px 12px rgba(139,92,246,0.3); transition: transform 0.2s;">🖨️ Print / Save as PDF</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Modal open={open} onClose={onClose} title="Performance Report" maxWidth="max-w-2xl">
      <div className="space-y-6">
        <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
          <div className="text-4xl mb-3">📄</div>
          <h3 className="text-lg font-bold text-white mb-2">Weekly Summary Ready</h3>
          <p className="text-sm text-white/40 mb-6 max-w-sm mx-auto">
            Generate a printable report with your logged productivity totals and recent health averages.
          </p>
          <button onClick={handlePrint} className="btn-glow px-6 py-2.5 flex items-center justify-center gap-2 mx-auto">
            <Download size={16} /> Open Printable Report
          </button>
        </div>
      </div>
    </Modal>
  );
}
