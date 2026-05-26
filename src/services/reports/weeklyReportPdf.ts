import React from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import toast from 'react-hot-toast';
import WeeklyIntelligenceReport from '../../components/reports/WeeklyIntelligenceReport';
import type { WeeklyReportStats } from '../../types/report';

// Strict A4 Standard Dimensions at 72 DPI (Standard Web DPI)
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const A4_WIDTH_PX = 794;

const EXPORT_TIMEOUT_MS = 30000; // 30 seconds watchdog timeout

// Export Mutex to block double-triggering memory crashes
let isExportingReport = false;

async function waitForRender(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  await new Promise((resolve) => setTimeout(resolve, 800)); // Ensure transitions and charts finish painting
}

export async function generateWeeklyReportPDF(report: WeeklyReportStats): Promise<void> {
  if (isExportingReport) {
    toast.error("Export is already in progress. Please wait.");
    return;
  }

  isExportingReport = true;
  const toastId = toast.loading("Initializing PDF report builder...");

  const mountNode = document.createElement('div');
  mountNode.style.position = 'fixed';
  mountNode.style.left = '-10000px';
  mountNode.style.top = '0';
  mountNode.style.width = `${A4_WIDTH_PX}px`;
  mountNode.style.zIndex = '-9999';
  mountNode.style.pointerEvents = 'none';
  document.body.appendChild(mountNode);

  const root = createRoot(mountNode);
  root.render(React.createElement(WeeklyIntelligenceReport, { report, exportMode: true }));

  // Watchdog timeout to prevent frozen threads
  const timeoutId = setTimeout(() => {
    if (isExportingReport) {
      isExportingReport = false;
      toast.error("Export timed out. Please try again.", { id: toastId });
      try {
        root.unmount();
        document.body.removeChild(mountNode);
      } catch (e) {
        console.warn("Watchdog cleanup error:", e);
      }
    }
  }, EXPORT_TIMEOUT_MS);

  try {
    await waitForRender();
    
    toast.loading("Verifying typography resources...", { id: toastId });
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const pageNodes = Array.from(mountNode.querySelectorAll<HTMLElement>('[data-weekly-report-page="true"]'));
    
    // 1. Zero-page Guard
    if (pageNodes.length === 0) {
      throw new Error("No report pages were generated during render step.");
    }

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

    // 2. Responsive Device Pixel Scale balancing (protects mobile memory)
    const dpr = window.devicePixelRatio || 1;
    const renderingScale = Math.min(dpr, 2);

    for (let index = 0; index < pageNodes.length; index += 1) {
      toast.loading(`Processing layout page ${index + 1} of ${pageNodes.length}...`, { id: toastId });
      const node = pageNodes[index];
      
      let canvas: HTMLCanvasElement;
      
      // 3. Per-page Failure Recovery
      try {
        canvas = await html2canvas(node, {
          backgroundColor: '#03050b',
          scale: renderingScale,
          useCORS: true,
          logging: false,
          allowTaint: false,
        });
      } catch (canvasErr) {
        console.warn(`Render error on page ${index + 1}, trying fallback:`, canvasErr);
        // Retry with relaxed CORS/taint rules
        canvas = await html2canvas(node, {
          backgroundColor: '#03050b',
          scale: 1.5,
          useCORS: false,
          allowTaint: true,
          logging: false,
        });
      }

      // 4. Memory-efficient JPEG compression (Instead of heavy raw PNG strings)
      const imageData = canvas.toDataURL('image/jpeg', 0.92);
      
      if (index > 0) {
        pdf.addPage();
      }

      pdf.addImage(imageData, 'JPEG', 0, 0, A4_WIDTH_PT, A4_HEIGHT_PT, undefined, 'FAST');
    }

    toast.loading("Compiling final report data...", { id: toastId });
    pdf.save(`mani-os-weekly-intelligence-${report.cycleEnd}.pdf`);
    toast.success("Intelligence report downloaded successfully!", { id: toastId });
  } catch (err: any) {
    console.error("PDF Compilation error:", err);
    toast.error(err?.message || "Failed to generate report. Please try again.", { id: toastId });
  } finally {
    clearTimeout(timeoutId);
    isExportingReport = false;
    try {
      root.unmount();
      document.body.removeChild(mountNode);
    } catch (e) {
      console.warn("Final node unmounting error:", e);
    }
  }
}

