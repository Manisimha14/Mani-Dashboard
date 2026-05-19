import { jsPDF } from 'jspdf';
import type { WeeklyReportStats } from '../../types/report';

/**
 * Programmatically generates and downloads a highly styled vector PDF report.
 * Uses strict coordinate constraints and paragraph wraps to prevent layout overflows.
 */
export function generateWeeklyReportPDF(stats: WeeklyReportStats, cycleDates: string[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setProperties({
    title: 'Weekly Summary Report',
    author: 'Mani-Dashboard Premium Offline Engine',
    subject: 'Weekly self-tracking statistics and recommendations',
  });

  let y = 50;

  // Header Card styling (Dark Slate background)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 90, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('WEEKLY SUMMARY REPORT', 40, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Cycle: ${cycleDates[0]} to ${cycleDates[6]}  |  Mani-Dashboard Premium Engine`, 40, 70);

  y = 125;

  const drawSectionTitle = (title: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(title.toUpperCase(), 40, y);
    y += 6;
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(1);
    doc.line(40, y, pageWidth - 40, y);
    y += 18;
  };

  // 1. Key Metrics cards layout
  drawSectionTitle('1. Health & Productivity Metrics');
  
  doc.setFont('helvetica', 'normal');
  const metrics = [
    { label: 'Focus Hours', value: `${(stats.focusMinutes / 60).toFixed(1)}h` },
    { label: 'Completions', value: `${stats.completedSessions}` },
    { label: 'Focus Quality', value: `${stats.focusQualityScore}%` },
    { label: 'Problems Solved', value: `${stats.problemsSolved}` },
    { label: 'Daily Water Avg', value: `${stats.waterAverageL}L` },
    { label: 'Daily Sleep Avg', value: `${stats.sleepAverageH}h` },
  ];

  const colWidth = (pageWidth - 80) / 3;
  metrics.forEach((m, idx) => {
    const row = Math.floor(idx / 3);
    const col = idx % 3;
    const xPos = 40 + col * colWidth;
    const yPos = y + row * 50;

    // Card background
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(xPos, yPos, colWidth - 10, 42, 'FD');

    // Value text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(m.value, xPos + 10, yPos + 18);

    // Label text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label.toUpperCase(), xPos + 10, yPos + 32);
  });
  y += 110;

  // Safe bullet point formatter with height-boundary tracking and dynamic wrapping
  const drawBullets = (title: string, list: string[]) => {
    if (y > pageHeight - 110) {
      doc.addPage();
      y = 50;
    }
    drawSectionTitle(title);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85); // slate-700

    list.forEach(item => {
      const splitText = doc.splitTextToSize(`• ${item}`, pageWidth - 90);
      splitText.forEach((line: string) => {
        if (y > pageHeight - 45) {
          doc.addPage();
          y = 50;
        }
        doc.text(line, 45, y);
        y += 15;
      });
      y += 3;
    });
    y += 10;
  };

  drawBullets('2. Weekly Highlights', stats.wins);
  drawBullets('3. Identified Concerns', stats.risks);
  drawBullets('4. Trend Insights', stats.correlationInsights);
  drawBullets('5. Action Plan & Next Steps', stats.actionPlan);

  // Footer metadata
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 75, pageHeight - 30);
    doc.text('Generated securely by Mani-Dashboard Premium Offline Engine', 40, pageHeight - 30);
  }

  doc.save(`weekly_performance_report_${cycleDates[6]}.pdf`);
}
