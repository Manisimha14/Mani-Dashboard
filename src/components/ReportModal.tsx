import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { format, subDays } from 'date-fns';
import { formatDuration } from '../lib/utils';
import { Trophy, Flame, Timer, Code2, BookOpen, Download } from 'lucide-react';
import Modal from '../components/Modal';

export default function ReportModal({ open, onClose }: { open: boolean, onClose: () => void }) {
  const { dailyActivity, focusSessions, problems, book, readingStreak, codingStreak, focusStreak, userSettings } = useAppStore();
  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = reportRef.current?.innerHTML;
    if (!content) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Dashboard Performance Report</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e1e2e; max-width: 900px; margin: 0 auto; background: #f8fafc; }
            .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
            h1 { color: #4c1d95; margin-bottom: 10px; font-weight: 800; font-size: 32px; letter-spacing: -1px; }
            .subtitle { color: #64748b; font-size: 16px; font-weight: 600; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 40px; }
            .card { background: #ffffff; padding: 24px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); text-align: center; border: 1px solid #f1f5f9; }
            .card-title { font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; margin-bottom: 12px; font-weight: 800; }
            .card-value { font-size: 36px; font-weight: 800; color: #1e293b; line-height: 1; }
            .card-sub { font-size: 14px; color: #10b981; font-weight: 600; margin-top: 8px; }
            
            .section-title { font-size: 20px; font-weight: 800; color: #334155; margin: 40px 0 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            .row { display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px dashed #cbd5e1; font-size: 16px; }
            .row span { color: #475569; }
            .row strong { color: #0f172a; font-weight: 800; }
            .row:last-child { border: none; }
            
            @media print {
              body { padding: 0; background: #ffffff; }
              .no-print { display: none; }
              .card { box-shadow: none; border: 2px solid #e2e8f0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Dashboard Analytics Report</h1>
            <div class="subtitle">Prepared for ${userSettings.name || 'User'} • ${format(new Date(), 'MMMM d, yyyy')}</div>
          </div>
          ${content}
          <div class="no-print" style="margin-top: 50px; text-align: center;">
            <button onclick="window.print()" style="background: #8b5cf6; color: white; border: none; padding: 14px 28px; border-radius: 8px; cursor: pointer; font-weight: 800; font-size: 16px; box-shadow: 0 4px 12px rgba(139,92,246,0.3); transition: transform 0.2s;">🖨️ Print / Save as PDF</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Last 7 days
  const weekActivity = dailyActivity.filter(a => new Date(a.date) >= subDays(new Date(), 7));
  const weekFocus = weekActivity.reduce((acc, a) => acc + a.focusMinutes, 0);
  const weekProblems = weekActivity.reduce((acc, a) => acc + a.problemsSolved, 0);
  const weekChapters = weekActivity.reduce((acc, a) => acc + a.chaptersRead, 0);

  return (
    <Modal open={open} onClose={onClose} title="Performance Report" maxWidth="max-w-2xl">
      <div className="space-y-6">
        <div ref={reportRef} className="hidden-for-real-but-captured" style={{ display: 'none' }}>
          <div className="section-title">Weekly Performance (Last 7 Days)</div>
          <div className="grid">
            <div className="card">
              <div className="card-title">Focus Time</div>
              <div className="card-value">${formatDuration(weekFocus)}</div>
            </div>
            <div className="card">
              <div className="card-title">Problems Solved</div>
              <div className="card-value">${weekProblems}</div>
            </div>
            <div className="card">
              <div className="card-title">Chapters Read</div>
              <div className="card-value">${weekChapters}</div>
            </div>
          </div>

          <div className="section-title">Lifetime Consistency Metrics</div>
          <div className="row">
            <span>Total Focus Time</span>
            <strong>{formatDuration(focusSessions.reduce((a, s) => a + (s.completed ? s.actualDuration || s.duration : 0), 0))}</strong>
          </div>
          <div className="row">
            <span>Total Problems Solved</span>
            <strong>{problems.filter(p => p.completed).length}</strong>
          </div>
          <div className="row">
            <span>Reading Progress</span>
            <strong>{book?.chapters.filter(c => c.completed).length || 0} chapters</strong>
          </div>
          <div className="row">
            <span>Highest Active Streak</span>
            <strong>{Math.max(readingStreak.longestStreak, codingStreak.longestStreak, focusStreak.longestStreak)} days</strong>
          </div>
        </div>

        {/* Preview UI */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
          <div className="text-4xl mb-3">📄</div>
          <h3 className="text-lg font-bold text-white mb-2">Weekly Summary Ready</h3>
          <p className="text-sm text-white/40 mb-6 max-w-sm mx-auto">
            Generate a beautiful, print-ready PDF containing your focus metrics, task completions, and streak records.
          </p>
          <button onClick={handlePrint} className="btn-glow px-6 py-2.5 flex items-center justify-center gap-2 mx-auto">
            <Download size={16} /> Open Printable Report
          </button>
        </div>
      </div>
    </Modal>
  );
}
