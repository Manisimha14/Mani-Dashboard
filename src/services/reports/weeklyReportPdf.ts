import React from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import WeeklyIntelligenceReport from '../../components/reports/WeeklyIntelligenceReport';
import type { WeeklyReportStats } from '../../types/report';

async function waitForRender(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
}

export async function generateWeeklyReportPDF(report: WeeklyReportStats): Promise<void> {
  const mountNode = document.createElement('div');
  mountNode.style.position = 'fixed';
  mountNode.style.left = '-10000px';
  mountNode.style.top = '0';
  mountNode.style.width = '794px';
  mountNode.style.zIndex = '-1';
  mountNode.style.pointerEvents = 'none';
  document.body.appendChild(mountNode);

  const root = createRoot(mountNode);
  root.render(React.createElement(WeeklyIntelligenceReport, { report, exportMode: true }));

  try {
    await waitForRender();
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const pageNodes = Array.from(mountNode.querySelectorAll<HTMLElement>('[data-weekly-report-page="true"]'));
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    pdf.setProperties({
      title: `Mani OS Weekly Intelligence Report ${report.cycleStart} - ${report.cycleEnd}`,
      author: 'Mani OS',
      subject: 'Premium weekly personal intelligence report',
    });

    for (let index = 0; index < pageNodes.length; index += 1) {
      const node = pageNodes[index];
      const canvas = await html2canvas(node, {
        backgroundColor: '#03050b',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imageData = canvas.toDataURL('image/png');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      if (index > 0) {
        pdf.addPage();
      }

      pdf.addImage(imageData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
    }

    pdf.save(`mani-os-weekly-intelligence-${report.cycleEnd}.pdf`);
  } finally {
    root.unmount();
    document.body.removeChild(mountNode);
  }
}
