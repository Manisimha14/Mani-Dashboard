import React from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import toast from 'react-hot-toast';
import BugReportPDFTemplate from '../../components/reports/BugReportPDFTemplate';
import type { BugReport } from '../../services/bugReports.service';

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const A4_WIDTH_PX = 794;

const EXPORT_TIMEOUT_MS = 25000; // 25s safety timeout

let isExportingBugReport = false;

async function waitForRender(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  await new Promise((resolve) => setTimeout(resolve, 600)); // wait for elements to fully paint
}

/**
 * Compiles a beautiful executive A4 PDF of an individual Bug Report ledger entry
 */
export async function generateBugReportPDF(report: BugReport): Promise<void> {
  if (isExportingBugReport) {
    toast.error("An export is already running. Please wait.");
    return;
  }

  isExportingBugReport = true;
  const toastId = toast.loading("Synthesizing Bug Triage PDF...");

  const mountNode = document.createElement('div');
  mountNode.style.position = 'fixed';
  mountNode.style.left = '-10000px';
  mountNode.style.top = '0';
  mountNode.style.width = `${A4_WIDTH_PX}px`;
  mountNode.style.zIndex = '-9999';
  mountNode.style.pointerEvents = 'none';
  document.body.appendChild(mountNode);

  const root = createRoot(mountNode);
  root.render(React.createElement(BugReportPDFTemplate, { report }));

  const timeoutId = setTimeout(() => {
    if (isExportingBugReport) {
      isExportingBugReport = false;
      toast.error("Export timed out. Please try again.", { id: toastId });
      cleanup();
    }
  }, EXPORT_TIMEOUT_MS);

  function cleanup() {
    try {
      root.unmount();
      document.body.removeChild(mountNode);
    } catch (e) {
      console.warn("PDF cleanup exception:", e);
    }
  }

  try {
    await waitForRender();
    
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const pageNodes = Array.from(mountNode.querySelectorAll<HTMLElement>('[data-bug-report-page="true"]'));
    if (pageNodes.length === 0) {
      throw new Error("Triage pages failed to render correctly.");
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    pdf.setProperties({
      title: `Mani OS QA Intelligence - Bug Report ${report.id}`,
      author: 'Mani OS',
      subject: 'Executive Bug Triage Report',
    });

    const dpr = window.devicePixelRatio || 1;
    const renderingScale = Math.min(dpr, 1.8); // Scale balancing

    for (let index = 0; index < pageNodes.length; index += 1) {
      const node = pageNodes[index];
      let canvas: HTMLCanvasElement;

      try {
        canvas = await html2canvas(node, {
          backgroundColor: '#03050b',
          scale: renderingScale,
          useCORS: true,
          logging: false,
        });
      } catch (err) {
        // Safe fallback capture
        canvas = await html2canvas(node, {
          backgroundColor: '#03050b',
          scale: 1.2,
          useCORS: false,
          allowTaint: true,
          logging: false,
        });
      }

      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      if (index > 0) pdf.addPage();
      pdf.addImage(imageData, 'JPEG', 0, 0, A4_WIDTH_PT, A4_HEIGHT_PT, undefined, 'FAST');
    }

    pdf.save(`bug-report-${report.id.slice(0, 8)}.pdf`);
    toast.success("Bug Triage Report PDF exported!", { id: toastId });
  } catch (err: any) {
    console.error("Bug Report PDF export error:", err);
    toast.error(err?.message || "Failed to generate Bug PDF.", { id: toastId });
  } finally {
    clearTimeout(timeoutId);
    isExportingBugReport = false;
    cleanup();
  }
}

/**
 * Compiles a beautiful executive A4 PDF of any generic JSON payload
 */
export async function generateGenericJSONPDF(jsonData: any, title?: string): Promise<void> {
  if (isExportingBugReport) {
    toast.error("An export is already running. Please wait.");
    return;
  }

  isExportingBugReport = true;
  const toastId = toast.loading("Converting JSON to Executive PDF...");

  const mountNode = document.createElement('div');
  mountNode.style.position = 'fixed';
  mountNode.style.left = '-10000px';
  mountNode.style.top = '0';
  mountNode.style.width = `${A4_WIDTH_PX}px`;
  mountNode.style.zIndex = '-9999';
  mountNode.style.pointerEvents = 'none';
  document.body.appendChild(mountNode);

  const root = createRoot(mountNode);
  root.render(React.createElement(BugReportPDFTemplate, { genericData: jsonData, title }));

  const timeoutId = setTimeout(() => {
    if (isExportingBugReport) {
      isExportingBugReport = false;
      toast.error("Export timed out. Please try again.", { id: toastId });
      cleanup();
    }
  }, EXPORT_TIMEOUT_MS);

  function cleanup() {
    try {
      root.unmount();
      document.body.removeChild(mountNode);
    } catch (e) {
      console.warn("JSON PDF cleanup exception:", e);
    }
  }

  try {
    await waitForRender();
    
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const pageNodes = Array.from(mountNode.querySelectorAll<HTMLElement>('[data-bug-report-page="true"]'));
    if (pageNodes.length === 0) {
      throw new Error("PDF converter pages failed to render.");
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });

    pdf.setProperties({
      title: title || 'JSON Triage Intelligence Export',
      author: 'Mani OS',
    });

    const dpr = window.devicePixelRatio || 1;
    const renderingScale = Math.min(dpr, 1.8);

    for (let index = 0; index < pageNodes.length; index += 1) {
      const node = pageNodes[index];
      let canvas: HTMLCanvasElement;

      try {
        canvas = await html2canvas(node, {
          backgroundColor: '#03050b',
          scale: renderingScale,
          useCORS: true,
          logging: false,
        });
      } catch (err) {
        canvas = await html2canvas(node, {
          backgroundColor: '#03050b',
          scale: 1.2,
          useCORS: false,
          allowTaint: true,
          logging: false,
        });
      }

      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      if (index > 0) pdf.addPage();
      pdf.addImage(imageData, 'JPEG', 0, 0, A4_WIDTH_PT, A4_HEIGHT_PT, undefined, 'FAST');
    }

    pdf.save(`json-export-${Date.now().toString().slice(-6)}.pdf`);
    toast.success("JSON converted and PDF downloaded successfully!", { id: toastId });
  } catch (err: any) {
    console.error("JSON to PDF conversion error:", err);
    toast.error(err?.message || "Failed to convert JSON.", { id: toastId });
  } finally {
    clearTimeout(timeoutId);
    isExportingBugReport = false;
    cleanup();
  }
}

/**
 * Compiles a beautiful executive A4 PDF of multiple Bug Reports using chunking/pagination
 * to prevent browser memory freezes or memory crashes.
 */
export async function generateBatchPDF(reports: BugReport[]): Promise<void> {
  if (reports.length === 0) {
    toast.error("No reports provided for batch export.");
    return;
  }
  if (isExportingBugReport) {
    toast.error("An export is already running. Please wait.");
    return;
  }

  isExportingBugReport = true;
  const toastId = toast.loading(`Synthesizing Batch QA Report (0/${reports.length})...`);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  pdf.setProperties({
    title: `Mani OS QA Intelligence - Batch Triage Report`,
    author: 'Mani OS',
    subject: 'Executive Bug Triage Report Batch',
  });

  const mountNode = document.createElement('div');
  mountNode.style.position = 'fixed';
  mountNode.style.left = '-10000px';
  mountNode.style.top = '0';
  mountNode.style.width = `${A4_WIDTH_PX}px`;
  mountNode.style.zIndex = '-9999';
  mountNode.style.pointerEvents = 'none';
  document.body.appendChild(mountNode);

  const dpr = window.devicePixelRatio || 1;
  const renderingScale = Math.min(dpr, 1.8);

  let isFirst = true;

  try {
    for (let i = 0; i < reports.length; i++) {
      toast.loading(`Processing Report ${i + 1}/${reports.length}...`, { id: toastId });
      
      const report = reports[i];
      const root = createRoot(mountNode);
      root.render(React.createElement(BugReportPDFTemplate, { report }));

      await waitForRender();
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const pageNodes = Array.from(mountNode.querySelectorAll<HTMLElement>('[data-bug-report-page="true"]'));
      if (pageNodes.length === 0) {
        root.unmount();
        throw new Error(`Triage pages failed to render for report: ${report.id}`);
      }

      for (let pageIdx = 0; pageIdx < pageNodes.length; pageIdx++) {
        const node = pageNodes[pageIdx];
        let canvas: HTMLCanvasElement;
        try {
          canvas = await html2canvas(node, {
            backgroundColor: '#03050b',
            scale: renderingScale,
            useCORS: true,
            logging: false,
          });
        } catch (err) {
          canvas = await html2canvas(node, {
            backgroundColor: '#03050b',
            scale: 1.2,
            useCORS: false,
            allowTaint: true,
            logging: false,
          });
        }

        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        if (!isFirst) {
          pdf.addPage();
        } else {
          isFirst = false;
        }
        pdf.addImage(imageData, 'JPEG', 0, 0, A4_WIDTH_PT, A4_HEIGHT_PT, undefined, 'FAST');
      }

      root.unmount();
      // Brief delay to give garbage collector space and prevent freezes
      await new Promise(r => setTimeout(r, 120));
    }

    pdf.save(`batch-bug-reports-${reports.length}-${Date.now().toString().slice(-4)}.pdf`);
    toast.success(`Batch QA PDF exported successfully! (${reports.length} reports)`, { id: toastId });
  } catch (err: any) {
    console.error("Batch PDF export error:", err);
    toast.error(err?.message || "Failed to generate Batch PDF.", { id: toastId });
  } finally {
    isExportingBugReport = false;
    try {
      document.body.removeChild(mountNode);
    } catch (e) {
      // already unmounted
    }
  }
}

