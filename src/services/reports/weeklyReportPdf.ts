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
    title: 'Weekly Performance Report',
    author: 'Mani-Dashboard Premium Offline Engine',
    subject: 'Weekly self-tracking statistics, analytics, and recommendations',
  });

  let y = 50;

  // Header Card styling (Slate-900 dark branding header)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 90, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('WEEKLY PERFORMANCE REPORT', 40, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Cycle: ${cycleDates[0]} to ${cycleDates[6]}  |  Mani-Dashboard Premium Offline Engine`, 40, 70);

  y = 125;

  const drawSectionTitle = (title: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(title.toUpperCase(), 40, y);
    y += 5;
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(1);
    doc.line(40, y, pageWidth - 40, y);
    y += 16;
  };

  // 1. Key Metrics Card Grid Layout
  drawSectionTitle('1. Health & Productivity Metrics');
  
  const metrics = [
    { label: 'Focus Hours', value: `${(stats.focusMinutes / 60).toFixed(1)}h` },
    { label: 'Completions', value: `${stats.completedSessions}` },
    { label: 'Focus Quality', value: `${stats.focusQualityScore}%` },
    { label: 'Problems Solved', value: `${stats.problemsSolved}` },
    { label: 'Chapters Done', value: `${stats.chaptersRead}` },
    { label: 'Weekly Water Intake', value: `${(stats.totalWaterIntakeMl / 1000).toFixed(1)}L` },
    { label: 'Daily Sleep Avg', value: `${stats.sleepAverageH}h` },
    { label: 'Weekly Workouts', value: `${stats.workoutCount}` },
    { label: 'Daily Steps Avg', value: `${stats.stepsAverage.toLocaleString()}` },
    { label: 'Calories Taken', value: `${stats.totalCaloriesTaken.toLocaleString()} kcal` },
    { label: 'Calories Burnt', value: `${stats.totalCaloriesBurnt.toLocaleString()} kcal` },
    { label: 'Daily Water Avg', value: `${stats.waterAverageL}L` }
  ];

  const colWidth = (pageWidth - 80) / 3;
  metrics.forEach((m, idx) => {
    const row = Math.floor(idx / 3);
    const col = idx % 3;
    const xPos = 40 + col * colWidth;
    const yPos = y + row * 45;

    // Card background
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(xPos, yPos, colWidth - 8, 38, 'FD');

    // Value text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(m.value, xPos + 8, yPos + 16);

    // Label text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label.toUpperCase(), xPos + 8, yPos + 28);
  });
  y += 190;

  // 2. Goal Achievement scorecard
  drawSectionTitle('2. Weekly Goal Scorecard');
  const goals = [
    { title: 'Hydration Target', progress: `${stats.waterDaysHit} / 7 Days`, status: stats.waterDaysHit >= 5 ? 'EXCELLENT' : 'ON TRACK' },
    { title: 'Sleep Target', progress: `${stats.sleepDaysHit} / 7 Days`, status: stats.sleepDaysHit >= 5 ? 'EXCELLENT' : 'ON TRACK' },
    { title: 'Coding Activity', progress: `${stats.problemsDaysHit} / 7 Days`, status: stats.problemsDaysHit >= 3 ? 'EXCELLENT' : 'ON TRACK' },
    { title: 'Reading Target', progress: `${stats.readingDaysHit} / 7 Days`, status: stats.readingDaysHit >= 3 ? 'EXCELLENT' : 'ON TRACK' },
  ];

  goals.forEach((g, idx) => {
    const xPos = 40 + (idx % 2) * ((pageWidth - 80) / 2);
    const yPos = y + Math.floor(idx / 2) * 32;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(xPos, yPos, ((pageWidth - 80) / 2) - 8, 26, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(g.title, xPos + 8, yPos + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(g.progress, xPos + 150, yPos + 16);
  });
  y += 75;

  // 3. Calendar Day highlights & Focus reflection outputs
  if (y > pageHeight - 110) {
    doc.addPage();
    y = 50;
  }

  drawSectionTitle('3. Daily Calendar Highlights');
  const dayHighlights = [
    { label: 'Best Focus Day', val: stats.bestFocusDay },
    { label: 'Most Active Coding Day', val: stats.bestCodingDay },
    { label: 'Lowest Sleep Day', val: stats.weakestSleepDay }
  ];

  dayHighlights.forEach((dh, idx) => {
    const xPos = 40 + idx * ((pageWidth - 80) / 3);
    doc.setFillColor(250, 250, 250);
    doc.rect(xPos, y, ((pageWidth - 80) / 3) - 8, 24, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(dh.label.toUpperCase(), xPos + 8, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(dh.val, xPos + 8, y + 19);
  });
  y += 40;

  // Focus reflections outputs
  const hasReflections = stats.problemsSolvedReflections > 0 || stats.learningMinutesReflections > 0 || stats.pagesReadReflections > 0 || stats.featuresShippedReflections > 0;
  if (hasReflections) {
    drawSectionTitle('4. Logged Reflection Outputs');
    const refData = [
      { label: 'Problems Solved', val: `${stats.problemsSolvedReflections}` },
      { label: 'Learning Time', val: `${stats.learningMinutesReflections}m` },
      { label: 'Book Pages Read', val: `${stats.pagesReadReflections}` },
      { label: 'Features Built', val: `${stats.featuresShippedReflections}` }
    ];

    refData.forEach((rd, idx) => {
      const xPos = 40 + idx * ((pageWidth - 80) / 4);
      doc.setFillColor(245, 243, 255); // light violet
      doc.rect(xPos, y, ((pageWidth - 80) / 4) - 6, 26, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(109, 40, 217); // violet-700
      doc.text(rd.val, xPos + 8, y + 11);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(139, 92, 246);
      doc.text(rd.label.toUpperCase(), xPos + 8, y + 20);
    });
    y += 42;
  }

  // Helper for adding bullet pages
  const drawBullets = (title: string, list: string[]) => {
    if (y > pageHeight - 110) {
      doc.addPage();
      y = 50;
    }
    drawSectionTitle(title);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85); // slate-700

    list.forEach(item => {
      const splitText = doc.splitTextToSize(`• ${item}`, pageWidth - 90);
      splitText.forEach((line: string) => {
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 50;
        }
        doc.text(line, 45, y);
        y += 13;
      });
      y += 2;
    });
    y += 8;
  };

  drawBullets('5. Executive Highlights', stats.wins);
  drawBullets('6. Identified Concerns', stats.risks);
  drawBullets('7. Health & Productivity Trends', stats.correlationInsights);
  drawBullets('8. Next Week Recommended Actions', stats.actionPlan);

  // 9. Custom Trackers Weekly Performance Report Section
  if (stats.trackerSummaries && stats.trackerSummaries.length > 0) {
    if (y > pageHeight - 120) {
      doc.addPage();
      y = 50;
    }
    drawSectionTitle('9. Custom Trackers Performance');

    stats.trackerSummaries.forEach((t) => {
      if (y > pageHeight - 50) {
        doc.addPage();
        y = 50;
      }

      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(226, 232, 240);
      doc.rect(40, y, pageWidth - 80, 28, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(t.title, 48, y + 17);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);

      let summaryText = `Type: ${t.type.toUpperCase()}  |  Completed: ${t.completedCount} / ${t.totalLogged}`;
      if (t.sumValue !== undefined) {
        summaryText += `  |  Total Value: ${t.sumValue}${t.unit ? ' ' + t.unit : ''}`;
      }
      if (t.avgValue !== undefined) {
        summaryText += `  |  Daily Avg: ${t.avgValue.toFixed(1)}${t.unit ? ' ' + t.unit : ''}`;
      }
      if (t.target !== undefined) {
        summaryText += `  |  Target: ${t.target}${t.unit ? ' ' + t.unit : ''}`;
      }

      doc.text(summaryText, 200, y + 17);
      y += 33;
    });
    y += 10;
  }

  // Apply footer numbers cleanly to all active pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 70, pageHeight - 24);
    doc.text('Generated securely by Mani-Dashboard Premium Offline Engine', 40, pageHeight - 24);
  }

  doc.save(`weekly_performance_report_${cycleDates[6]}.pdf`);
}
