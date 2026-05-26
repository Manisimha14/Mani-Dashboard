import React from 'react';
import type { BugReport } from '../../services/bugReports.service';

const A4_STYLE: React.CSSProperties = {
  width: 794,
  height: 1123,
  background: 'linear-gradient(180deg, #040814 0%, #070d1e 40%, #03050b 100%)',
  color: '#f8fafc',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  padding: '40px 48px',
  position: 'relative',
  overflow: 'hidden',
  boxSizing: 'border-box',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)',
};

const glassCard: React.CSSProperties = {
  background: 'rgba(10, 15, 30, 0.75)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
  borderRadius: 14,
  padding: '16px 20px',
  boxSizing: 'border-box',
};

const badgeStyle = (type: string, val: string): React.CSSProperties => {
  const norm = val.toLowerCase();
  let bg = 'rgba(255,255,255,0.05)';
  let color = '#cbd5e1';
  let border = '1px solid rgba(255,255,255,0.08)';

  if (type === 'severity') {
    if (norm === 'critical') {
      bg = 'rgba(239, 68, 68, 0.12)';
      color = '#fca5a5';
      border = '1px solid rgba(239, 68, 68, 0.25)';
    } else if (norm === 'medium') {
      bg = 'rgba(245, 158, 11, 0.12)';
      color = '#fde047';
      border = '1px solid rgba(245, 158, 11, 0.25)';
    } else {
      bg = 'rgba(59, 130, 246, 0.12)';
      color = '#93c5fd';
      border = '1px solid rgba(59, 130, 246, 0.25)';
    }
  } else if (type === 'status') {
    if (norm === 'open') {
      bg = 'rgba(244, 63, 94, 0.12)';
      color = '#fda4af';
      border = '1px solid rgba(244, 63, 94, 0.25)';
    } else if (norm === 'fixed') {
      bg = 'rgba(16, 185, 129, 0.12)';
      color = '#6ee7b7';
      border = '1px solid rgba(16, 185, 129, 0.25)';
    } else if (norm === 'in_progress') {
      bg = 'rgba(139, 92, 246, 0.12)';
      color = '#c084fc';
      border = '1px solid rgba(139, 92, 246, 0.25)';
    }
  }

  return {
    padding: '3px 9px',
    borderRadius: 6,
    fontSize: 9,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    display: 'inline-block',
    backgroundColor: bg,
    color,
    border,
  };
};

function formatKey(key: string): string {
  return key.replace(/_/g, ' ').toUpperCase();
}

type Props = {
  report?: BugReport;
  genericData?: any;
  title?: string;
};

export default function BugReportPDFTemplate({ report, genericData, title }: Props) {
  const isGeneric = !report && genericData;
  const displayTitle = title || (report ? `Bug Report: ${report.title}` : 'JSON Triage Intelligence Export');
  
  // Format dates cleanly
  const formattedDate = report?.created_at 
    ? new Date(report.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page 1 - Primary Intelligence & Triage */}
      <div data-bug-report-page="true" style={A4_STYLE}>
        {/* Subtle executive background glowing patterns */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: 280, height: 280, background: 'rgba(139, 92, 246, 0.05)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none' }} />
        
        {/* Header Block */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 16 }}>
          <div>
            <div style={{ fontSize: 9, color: '#a78bfa', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 800 }}>Mani OS QA Intelligence</div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', marginTop: 4, lineHeight: 1.1 }}>{displayTitle}</h1>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>Generated on {formattedDate}</div>
          </div>
          
          {!isGeneric && report && (
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={badgeStyle('severity', report.severity)}>{report.severity}</span>
              <span style={badgeStyle('status', report.status)}>{report.status}</span>
            </div>
          )}
        </div>

        {/* Detailed Bug Section */}
        {!isGeneric && report ? (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Description */}
            <div style={glassCard}>
              <div style={{ fontSize: 9, color: '#38bdf8', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 800, marginBottom: 6 }}>Issue Description</div>
              <p style={{ fontSize: 12, lineHeight: 1.5, color: '#e2e8f0', margin: 0, fontWeight: 500 }}>{report.description}</p>
            </div>

            {/* System Context Data Grid */}
            <div style={glassCard}>
              <div style={{ fontSize: 9, color: '#38bdf8', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 800, marginBottom: 10 }}>System / Telemetry Metadata</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', fontSize: 10.5 }}>
                {Object.entries({
                  id: report.id,
                  type: report.type,
                  os: report.metadata?.os || 'N/A',
                  browser: report.metadata?.browser || 'N/A',
                  language: report.metadata?.language || 'N/A',
                  connection: report.metadata?.connection || 'N/A',
                  window_size: report.metadata?.window_size || 'N/A',
                  screen_resolution: report.metadata?.screen_resolution || 'N/A',
                  app_version: report.metadata?.app_version || 'N/A',
                  url: report.metadata?.url || 'N/A'
                }).map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 2, borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: 4 }}>
                    <span style={{ fontSize: 7.5, color: '#64748b', fontWeight: 800, letterSpacing: '0.08em' }}>{formatKey(key)}</span>
                    <span style={{ color: '#cbd5e1', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={String(val)}>{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom metadata properties table */}
            {report.metadata && Object.keys(report.metadata).some(k => !['os', 'browser', 'language', 'connection', 'window_size', 'screen_resolution', 'app_version', 'url'].includes(k)) && (
              <div style={glassCard}>
                <div style={{ fontSize: 9, color: '#a78bfa', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 800, marginBottom: 8 }}>Additional Payload Parameters</div>
                <pre style={{ fontSize: 9.5, color: '#94a3b8', background: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 8, overflow: 'hidden', fontFamily: 'Courier New, monospace', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {JSON.stringify(
                    Object.fromEntries(
                      Object.entries(report.metadata).filter(([k]) => !['os', 'browser', 'language', 'connection', 'window_size', 'screen_resolution', 'app_version', 'url'].includes(k))
                    ),
                    null,
                    2
                  )}
                </pre>
              </div>
            )}
          </div>
        ) : (
          /* Generic JSON Tree View & Analysis */
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={glassCard}>
              <div style={{ fontSize: 9, color: '#38bdf8', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 800, marginBottom: 8 }}>JSON Schema Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, textAlign: 'center' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: 8, color: '#64748b', fontWeight: 800 }}>TYPE</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#38bdf8', marginTop: 4 }}>{Array.isArray(genericData) ? 'Array' : typeof genericData === 'object' ? 'Object' : typeof genericData}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: 8, color: '#64748b', fontWeight: 800 }}>FIELDS / ITEMS</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#a78bfa', marginTop: 4 }}>{Array.isArray(genericData) ? genericData.length : typeof genericData === 'object' && genericData !== null ? Object.keys(genericData).length : 1}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: 8, color: '#64748b', fontWeight: 800 }}>SIZE</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#10b981', marginTop: 4 }}>~{(JSON.stringify(genericData).length / 1024).toFixed(2)} KB</div>
                </div>
              </div>
            </div>

            <div style={glassCard}>
              <div style={{ fontSize: 9, color: '#38bdf8', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 800, marginBottom: 8 }}>Raw payload contents</div>
              <pre style={{ fontSize: 9.5, color: '#cbd5e1', background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 10, maxHeight: 720, overflow: 'hidden', fontFamily: 'Courier New, monospace', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.4 }}>
                {JSON.stringify(genericData, null, 2).slice(0, 3600)}
                {JSON.stringify(genericData, null, 2).length > 3600 && '\n\n... [Payload Truncated for Page Limits] ...'}
              </pre>
            </div>
          </div>
        )}

        {/* Executive Footer */}
        <div style={{ position: 'absolute', bottom: 20, left: 48, right: 48, display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: '#475569', fontWeight: 600 }}>
          <span>Mani OS Premium Bug & Triage Intelligence Report Ledger.</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
}
