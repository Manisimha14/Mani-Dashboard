import React from 'react';
import {
  Activity,
  Brain,
  Footprints,
  MoonStar,
  Trophy,
  Code2,
  BookOpen,
  Flame,
  Dumbbell,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import type { CustomTrackerWeeklySummary, DailyReportPoint, RadarMetric, ReportMetricCard, WeeklyComparisonRow, WeeklyReportStats } from '../../types/report';

const PAGE_STYLE: React.CSSProperties = {
  width: 794,
  height: 1123, // Strict A4 height to prevent vertical overflows, text squishing, or page bleed
  background: 'linear-gradient(180deg, #040814 0%, #070d1e 40%, #03050b 100%)',
  color: '#f8fafc',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  borderRadius: 24,
  padding: '36px 40px', // Slightly tightened to maximize visual data density
  position: 'relative',
  overflow: 'hidden',
  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.06)',
  boxSizing: 'border-box',
};

const glassCard: React.CSSProperties = {
  background: 'rgba(10, 15, 30, 0.85)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  borderRadius: 12,
  boxSizing: 'border-box',
};

const ExportModeContext = React.createContext(false);

function getCardProps(exportMode: boolean, padding: string | number = 20) {
  return {
    style: exportMode ? { ...glassCard, padding } : { padding },
    className: exportMode ? "" : "glass-card hover:border-violet-500/20 transition-all duration-300 shadow-lg bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-3xl",
  };
}

const mutedText = '#94a3b8';
const titleText = '#ffffff';

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}%`;
  if (delta < 0) return `${delta}%`;
  return '0%';
}

function directionIcon(direction: 'up' | 'down' | 'flat') {
  if (direction === 'up') return <TrendingUp size={11} />;
  if (direction === 'down') return <TrendingDown size={11} />;
  return <Minus size={11} />;
}

function directionColor(direction: 'up' | 'down' | 'flat') {
  if (direction === 'up') return '#10b981'; // emerald
  if (direction === 'down') return '#ef4444'; // red
  return '#94a3b8';
}

function toneColor(tone: WeeklyReportStats['statusTone']): string {
  if (tone === 'emerald') return '#10b981';
  if (tone === 'amber') return '#fbbf24';
  if (tone === 'rose') return '#fb7185';
  return '#8b5cf6';
}

function getMetricTheme(label: string) {
  const lbl = label.toLowerCase();
  if (lbl.includes('focus')) return { dot: '#8b5cf6', bar: 'linear-gradient(90deg, #8b5cf6, #c084fc)' };
  if (lbl.includes('coding') || lbl.includes('solve')) return { dot: '#06b6d4', bar: 'linear-gradient(90deg, #06b6d4, #60a5fa)' };
  if (lbl.includes('sleep')) return { dot: '#ec4899', bar: 'linear-gradient(90deg, #ec4899, #f472b6)' };
  if (lbl.includes('hydration') || lbl.includes('water')) return { dot: '#38bdf8', bar: 'linear-gradient(90deg, #38bdf8, #22d3ee)' };
  if (lbl.includes('step')) return { dot: '#10b981', bar: 'linear-gradient(90deg, #10b981, #34d399)' };
  return { dot: '#a78bfa', bar: 'linear-gradient(90deg, #a78bfa, #c084fc)' };
}

function SectionTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, position: 'relative', paddingLeft: 12, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ position: 'absolute', left: 0, top: 2, bottom: 2, width: 3, borderRadius: 2, background: 'linear-gradient(180deg, #38bdf8, #8b5cf6)' }} />
      <div style={{ fontSize: 8.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 800 }}>{eyebrow}</div>
      <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em', color: '#ffffff', lineHeight: 1.15 }}>{title}</div>
      {subtitle ? <div style={{ fontSize: 10.5, lineHeight: 1.4, color: '#94a3b8', marginTop: 1, maxWidth: 540 }}>{subtitle}</div> : null}
    </div>
  );
}

function MetricCard({ metric }: { metric: ReportMetricCard }) {
  const deltaColor = directionColor(metric.direction);
  const deltaBg = metric.direction === 'up' ? 'rgba(16, 185, 129, 0.05)' : metric.direction === 'down' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255, 255, 255, 0.03)';
  const deltaBorder = metric.direction === 'up' ? 'rgba(16, 185, 129, 0.15)' : metric.direction === 'down' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)';
  const theme = getMetricTheme(metric.label);
  const exportMode = React.useContext(ExportModeContext);
  
  return (
    <div 
      {...getCardProps(exportMode, exportMode ? '12px 14px 10px' : '16px 16px 14px')}
      style={exportMode ? { ...glassCard, padding: '12px 14px 10px', display: 'flex', flexDirection: 'column', gap: 6, height: 105, boxSizing: 'border-box' } : { padding: '16px 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: theme.dot, boxShadow: `0 0 8px ${theme.dot}` }} />
          <div style={{ fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#cbd5e1', fontWeight: 800 }}>{metric.label}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: deltaColor, fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, backgroundColor: deltaBg, border: `1px solid ${deltaBorder}` }}>
          {directionIcon(metric.direction)}
          <span>{formatDelta(metric.deltaPct)}</span>
        </div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em', color: '#ffffff', lineHeight: 1.0 }}>{metric.value}</div>
      <div style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 600 }}>{metric.subtitle}</div>
      <div style={{ height: 4, borderRadius: 999, backgroundColor: 'rgba(255, 255, 255, 0.05)', overflow: 'hidden', marginTop: 2 }}>
        <div
          style={{
            width: `${Math.max(4, Math.min(metric.progressPct ?? 0, 100))}%`,
            height: '100%',
            background: theme.bar,
            borderRadius: 999,
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 8.5, color: mutedText, marginTop: 1 }}>
        <span>{metric.targetLabel}</span>
        <span>{metric.deltaLabel}</span>
      </div>
    </div>
  );
}

function FocusBarChart({ points }: { points: DailyReportPoint[] }) {
  const width = 320;
  const height = 150;
  const max = Math.max(...points.map((point) => point.focusMinutes), 1);
  const barWidth = width / points.length - 12;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ minHeight: 110 }}>
      <defs>
        <linearGradient id="focusBarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <filter id="barGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <line x1="10" y1="30" x2={width - 10} y2="30" stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
      <line x1="10" y1="80" x2={width - 10} y2="80" stroke="rgba(255,255,255,0.03)" strokeDasharray="3,3" />
      {points.map((point, index) => {
        const x = index * (width / points.length) + 6;
        const barHeight = Math.max(8, (point.focusMinutes / max) * 100);
        const y = height - barHeight - 24;
        return (
          <g key={point.date}>
            <rect x={x} y={height - 124} width={barWidth} height={100} rx={barWidth / 2} fill="rgba(255,255,255,0.015)" />
            <rect x={x} y={y} width={barWidth} height={barHeight} rx={barWidth / 2} fill="url(#focusBarGradient)" filter="url(#barGlow)" />
            <text x={x + barWidth / 2} y={height - 8} fill="#94a3b8" fontSize="9" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif" textAnchor="middle">{point.shortLabel}</text>
          </g>
        );
      })}
    </svg>
  );
}

function SleepTrendChart({ points }: { points: DailyReportPoint[] }) {
  const width = 320;
  const height = 150;
  const sleepHours = points.map((point) => point.sleepMinutes / 60);
  const max = Math.max(...sleepHours, 1);
  const min = Math.min(...sleepHours.filter((value) => value > 0), max > 1 ? max : 0);

  const plotted = sleepHours.map((value, index) => {
    const x = 18 + (index * (width - 36)) / Math.max(points.length - 1, 1);
    const y = value > 0 ? height - 24 - ((value - min) / Math.max(max - min, 1)) * 86 : height - 24;
    return { x, y, value };
  });

  const path = plotted.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const fillPath = plotted.length > 0
    ? `${path} L ${plotted[plotted.length - 1].x} ${height - 24} L ${plotted[0].x} ${height - 24} Z`
    : '';

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ minHeight: 110 }}>
      <defs>
        <filter id="sleepLineGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="sleepAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f472b6" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#f472b6" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <line x1="18" y1="40" x2={width - 18} y2="40" stroke="rgba(255,255,255,0.03)" />
      <line x1="18" y1="88" x2={width - 18} y2="88" stroke="rgba(255,255,255,0.03)" />
      {fillPath && <path d={fillPath} fill="url(#sleepAreaGradient)" />}
      <path d={path} fill="none" stroke="#ec4899" strokeWidth="3.5" strokeLinecap="round" filter="url(#sleepLineGlow)" opacity="0.5" />
      <path d={path} fill="none" stroke="#f472b6" strokeWidth="2.2" strokeLinecap="round" />
      {plotted.map((point, index) => (
        <g key={points[index].date}>
          <circle cx={point.x} cy={point.y} r="4.5" fill="#050814" stroke="#f472b6" strokeWidth="2" />
          <text x={point.x} y={height - 8} fill="#94a3b8" fontSize="9" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif" textAnchor="middle">{points[index].shortLabel}</text>
        </g>
      ))}
    </svg>
  );
}

function RingProgress({ current, total, label, valueLabel, accent }: { current: number; total: number; label: string; valueLabel: string; accent: string }) {
  const radius = 44;
  const strokeWidth = 6.5;
  const normalizedRadius = radius - strokeWidth;
  const circumference = normalizedRadius * 2 * Math.PI;
  const pct = total > 0 ? Math.min(current / total, 1) : 0;
  const strokeDashoffset = circumference - pct * circumference;
  const exportMode = React.useContext(ExportModeContext);

  return (
    <div 
      {...getCardProps(exportMode, exportMode ? '12px 14px' : 16)}
      style={exportMode ? { ...glassCard, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, height: 170, boxSizing: 'border-box' } : { padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }} />
          <div style={{ fontSize: 8.5, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#cbd5e1', fontWeight: 800 }}>{label}</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', marginTop: 3 }}>{valueLabel}</div>
        <div style={{ fontSize: 9.5, color: mutedText, fontWeight: 600, marginTop: 1 }}>{Math.round(pct * 100)}% of weekly goal</div>
      </div>
      <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        <circle stroke="rgba(255,255,255,0.03)" fill="transparent" strokeWidth={strokeWidth} r={normalizedRadius} cx={radius} cy={radius} />
        <circle
          stroke={accent}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          style={{ filter: `drop-shadow(0 0 4px ${accent})` }}
        />
      </svg>
    </div>
  );
}

function CaloriesCompareChart({ points }: { points: DailyReportPoint[] }) {
  const width = 320;
  const height = 150;
  const max = Math.max(...points.map((point) => Math.max(point.caloriesIn, point.caloriesOut)), 1);
  const groupWidth = width / points.length;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ minHeight: 110 }}>
      <line x1="8" y1="35" x2={width - 8} y2="35" stroke="rgba(255,255,255,0.03)" />
      <line x1="8" y1="85" x2={width - 8} y2="85" stroke="rgba(255,255,255,0.03)" />
      {points.map((point, index) => {
        const x = index * groupWidth + 8;
        const intakeHeight = Math.max(6, (point.caloriesIn / max) * 94);
        const burnHeight = Math.max(6, (point.caloriesOut / max) * 94);
        return (
          <g key={point.date}>
            <rect x={x} y={height - intakeHeight - 28} width={10} height={intakeHeight} rx={5} fill="#fb7185" opacity="0.9" />
            <rect x={x + 13} y={height - burnHeight - 28} width={10} height={burnHeight} rx={5} fill="#fb923c" opacity="0.9" />
            <text x={x + 11.5} y={height - 8} fill="#94a3b8" fontSize="9" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif" textAnchor="middle">{point.shortLabel}</text>
          </g>
        );
      })}
    </svg>
  );
}

function SimpleLineChart({ points, valueForPoint, color }: { points: DailyReportPoint[]; valueForPoint: (point: DailyReportPoint) => number; color: string }) {
  const width = 320;
  const height = 150;
  const values = points.map(valueForPoint);
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const plotted = values.map((value, index) => {
    const x = 18 + (index * (width - 36)) / Math.max(values.length - 1, 1);
    const y = height - 24 - ((value - min) / Math.max(max - min, 1)) * 86;
    return { x, y };
  });
  const path = plotted.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const fillGradientId = `areaFill-${color.replace('#', '')}`;
  const fillPath = plotted.length > 0
    ? `${path} L ${plotted[plotted.length - 1].x} ${height - 24} L ${plotted[0].x} ${height - 24} Z`
    : '';

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ minHeight: 110 }}>
      <defs>
        <filter id={`lineGlow-${color.replace('#', '')}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id={fillGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <line x1="18" y1="40" x2={width - 18} y2="40" stroke="rgba(255,255,255,0.03)" />
      <line x1="18" y1="88" x2={width - 18} y2="88" stroke="rgba(255,255,255,0.03)" />
      {fillPath && <path d={fillPath} fill={`url(#${fillGradientId})`} />}
      <path d={path} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" filter={`url(#lineGlow-${color.replace('#', '')})`} opacity="0.5" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      {plotted.map((point, index) => (
        <g key={points[index].date}>
          <circle cx={point.x} cy={point.y} r="4.5" fill="#050814" stroke={color} strokeWidth="2" />
          <text x={point.x} y={height - 8} fill="#94a3b8" fontSize="9" fontWeight="700" fontFamily="system-ui, -apple-system, sans-serif" textAnchor="middle">{points[index].shortLabel}</text>
        </g>
      ))}
    </svg>
  );
}

function CodingHeatmap({ points }: { points: DailyReportPoint[] }) {
  const exportMode = React.useContext(ExportModeContext);
  return (
    <div 
      className={exportMode ? "" : "grid grid-cols-4 sm:grid-cols-7 gap-2.5"}
      style={exportMode ? { display: 'grid', gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`, gap: 8, marginTop: 10 } : { marginTop: 10 }}
    >
      {points.map((point) => {
        const intensity = Math.min(point.codingSolved, 4);
        const background = intensity === 0
          ? 'rgba(255,255,255,0.02)'
          : intensity === 1
          ? 'rgba(6, 182, 212, 0.12)'
          : intensity === 2
          ? 'rgba(6, 182, 212, 0.25)'
          : intensity === 3
          ? 'rgba(59, 130, 246, 0.45)'
          : 'rgba(6, 182, 212, 0.75)';
        const border = intensity === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(6, 182, 212, 0.3)';
        
        return (
          <div key={point.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ 
              width: 38, 
              height: 38, 
              borderRadius: 10, 
              background, 
              border: `1px solid ${border}`, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: 13,
              fontWeight: 800, 
              color: intensity > 0 ? '#ffffff' : 'rgba(255,255,255,0.1)',
              boxShadow: intensity > 3 ? '0 0 12px rgba(6, 182, 212, 0.3)' : 'none'
            }}>
              {point.codingSolved > 0 ? point.codingSolved : '0'}
            </div>
            <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700 }}>{point.shortLabel}</div>
          </div>
        );
      })}
    </div>
  );
}

function WorkoutTimeline({ points }: { points: DailyReportPoint[] }) {
  const exportMode = React.useContext(ExportModeContext);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
      {points.map((point) => {
        // Smart workout de-duplication to prevent massive height card wraps
        const summaryMap = new Map<string, number>();
        point.workoutNames.forEach((name) => {
          const trimmed = name.replace(/Synced/gi, '').replace(/Google Fit/gi, '').replace(/\(Simulated\)/gi, '').trim();
          if (!trimmed) return;
          const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
          summaryMap.set(formatted, (summaryMap.get(formatted) || 0) + 1);
        });
        
        const summaryParts: string[] = [];
        summaryMap.forEach((count, name) => {
          if (count > 1) {
            summaryParts.push(`${count}x ${name}`);
          } else {
            summaryParts.push(name);
          }
        });
        
        const namesText = summaryParts.length > 0 ? summaryParts.join(' • ') : 'No workout logged';
        
        return (
          <div 
            key={point.date} 
            {...getCardProps(exportMode, '8px 12px')}
            style={exportMode ? { ...glassCard, padding: '8px 12px', display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: 10, alignItems: 'center' } : { padding: '8px 12px', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}
          >
            <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8' }}>{point.shortLabel}</div>
            <div style={{ fontSize: 10.5, color: point.workoutCount > 0 ? '#f8fafc' : 'rgba(255,255,255,0.25)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {namesText}
            </div>
            <div style={{ fontSize: 10, color: point.workoutCount > 0 ? '#fb923c' : 'rgba(255,255,255,0.1)', fontWeight: 800 }}>
              {point.workoutMinutes > 0 ? `${point.workoutMinutes}m` : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RadarChart({ metrics }: { metrics: RadarMetric[] }) {
  const size = 260;
  const center = size / 2;
  const radius = 80;
  const angleStep = (Math.PI * 2) / metrics.length;
  const exportMode = React.useContext(ExportModeContext);

  const polygon = metrics.map((metric, index) => {
    const angle = -Math.PI / 2 + angleStep * index;
    const distance = radius * (metric.value / 100);
    return `${center + Math.cos(angle) * distance},${center + Math.sin(angle) * distance}`;
  }).join(' ');

  return (
    <svg width={exportMode ? size : "100%"} height={exportMode ? size : "100%"} viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: size, margin: '0 auto', overflow: 'visible' }}>
      <defs>
        <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {[25, 50, 75, 100].map((ring) => {
        const points = metrics.map((_, index) => {
          const angle = -Math.PI / 2 + angleStep * index;
          const distance = radius * (ring / 100);
          return `${center + Math.cos(angle) * distance},${center + Math.sin(angle) * distance}`;
        }).join(' ');
        return (
          <polygon 
            key={ring} 
            points={points} 
            fill="none" 
            stroke="rgba(255,255,255,0.03)" 
            strokeWidth="1" 
          />
        );
      })}
      {metrics.map((metric, index) => {
        const angle = -Math.PI / 2 + angleStep * index;
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        const textOffset = 14;
        const labelX = center + Math.cos(angle) * (radius + textOffset);
        const labelY = center + Math.sin(angle) * (radius + textOffset) + 4;
        
        return (
          <g key={metric.label}>
            <line x1={center} y1={center} x2={x} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={labelX} y={labelY} fill="#94a3b8" fontSize="9" fontWeight="800" fontFamily="system-ui, -apple-system, sans-serif" textAnchor="middle">{metric.label}</text>
          </g>
        );
      })}
      <polygon points={polygon} fill="rgba(6, 182, 212, 0.08)" stroke="#06b6d4" strokeWidth="2.5" filter="url(#radarGlow)" />
      <circle cx={center} cy={center} r="3" fill="#06b6d4" />
    </svg>
  );
}

function ComparisonTable({ rows }: { rows: WeeklyComparisonRow[] }) {
  const exportMode = React.useContext(ExportModeContext);
  return (
    <div 
      className={exportMode ? "" : "grid grid-cols-1 md:grid-cols-2 gap-4"}
      style={exportMode ? { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 } : undefined}
    >
      {rows.map((row) => {
        const isUp = row.direction === 'up';
        const isDown = row.direction === 'down';
        const deltaColor = directionColor(row.direction);
        const deltaBg = isUp ? 'rgba(16, 185, 129, 0.05)' : isDown ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255, 255, 255, 0.03)';
        const deltaBorder = isUp ? 'rgba(16, 185, 129, 0.15)' : isDown ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)';
        
        return (
          <div 
            key={row.id} 
            {...getCardProps(exportMode, '12px 14px')}
            style={exportMode ? { ...glassCard, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 } : { padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', fontWeight: 800 }}>{row.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: deltaColor, fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 6, backgroundColor: deltaBg, border: `1px solid ${deltaBorder}` }}>
                {directionIcon(row.direction)}
                {formatDelta(row.deltaPct)}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, fontWeight: 700 }}>
              <span style={{ color: '#ffffff' }}>{row.currentValue}</span>
              <span style={{ color: '#64748b' }}>Prev {row.previousValue}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InsightBlock({ report }: { report: WeeklyReportStats }) {
  const exportMode = React.useContext(ExportModeContext);
  if (report.validatedInsights.length === 0) {
    return (
      <div 
        {...getCardProps(exportMode, 16)}
        style={exportMode ? { ...glassCard, padding: 16, display: 'flex', alignItems: 'center', gap: 12, borderLeft: '3px solid #06b6d4' } : { padding: 16, display: 'flex', alignItems: 'center', gap: 12, borderLeft: '3px solid #06b6d4' }}
      >
        <ShieldCheck size={18} color="#06b6d4" />
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#ffffff' }}>AI Insights</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{report.insightsFallback}</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={exportMode ? "" : "grid grid-cols-1 md:grid-cols-2 gap-4"}
      style={exportMode ? { display: 'grid', gridTemplateColumns: `repeat(${report.validatedInsights.length}, minmax(0, 1fr))`, gap: 12 } : undefined}
    >
      {report.validatedInsights.map((insight) => (
        <div 
          key={insight.id} 
          {...getCardProps(exportMode, 16)}
          style={exportMode ? { ...glassCard, padding: 16, display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '3px solid #06b6d4' } : { padding: 16, display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '3px solid #06b6d4' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#06b6d4', fontWeight: 800 }}>{insight.confidence} confidence</div>
            <div style={{ fontSize: 8, color: '#64748b', fontWeight: 600 }}>{insight.source}</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>{insight.title}</div>
          <div style={{ fontSize: 11, lineHeight: 1.5, color: '#cbd5e1' }}>{insight.body}</div>
        </div>
      ))}
    </div>
  );
}

function TrackerCards({ cards }: { cards: CustomTrackerWeeklySummary[] }) {
  const exportMode = React.useContext(ExportModeContext);
  if (cards.length === 0) {
    return (
      <div 
        {...getCardProps(exportMode, 14)}
        style={exportMode ? { ...glassCard, padding: 14, color: mutedText, fontSize: 11 } : { padding: 14, color: mutedText, fontSize: 11 }}
      >
        No custom tracker activity was logged in this cycle.
      </div>
    );
  }

  return (
    <div 
      className={exportMode ? "" : "grid grid-cols-1 md:grid-cols-2 gap-4"}
      style={exportMode ? { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 } : undefined}
    >
      {cards.map((card) => {
        const progress = card.target ? Math.min((card.completedCount / card.target) * 100, 100) : Math.min((card.completedCount / Math.max(card.totalLogged, 1)) * 100, 100);
        return (
          <div 
            key={card.trackerId} 
            {...getCardProps(exportMode, 14)}
            style={exportMode ? { ...glassCard, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 } : { padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff' }}>{card.title}</div>
                <div style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 2 }}>{card.type}</div>
              </div>
              <div style={{ fontSize: 9, color: '#06b6d4', fontWeight: 800, padding: '2px 6px', borderRadius: 6, backgroundColor: 'rgba(6, 182, 212, 0.06)', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
                {card.streakDays}d streak
              </div>
            </div>
            <div style={{ height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden', marginTop: 2 }}>
              <div style={{ width: `${Math.max(4, progress)}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #06b6d4, #8b5cf6)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10, color: '#cbd5e1', fontWeight: 600 }}>
              <span>{card.milestoneText}</span>
              <span style={{ color: '#64748b' }}>{card.avgValue !== undefined ? `${card.avgValue.toFixed(1)}${card.unit ? ` ${card.unit}` : ''} avg` : `${card.totalLogged} logs`}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CodingAnalyticsPanel({ report }: { report: WeeklyReportStats }) {
  const hardestLabel = report.codingAnalytics.hardestSolvedProblem ?? 'No validated hard solve this week';
  const avgSolveTime = report.codingAnalytics.averageSolveTimeMinutes ? `${report.codingAnalytics.averageSolveTimeMinutes} min` : 'Not enough timed solves';
  const exportMode = React.useContext(ExportModeContext);

  return (
    <div 
      {...getCardProps(exportMode, 16)}
      style={exportMode ? { ...glassCard, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 } : { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Code2 size={15} color="#06b6d4" />
        <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#94a3b8' }}>Coding Intelligence</div>
      </div>

      <div 
        className={exportMode ? "" : "grid grid-cols-1 sm:grid-cols-3 gap-2.5"}
        style={exportMode ? { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 } : undefined}
      >
        {[
          { label: 'Acceptance Streak', value: `${report.codingAnalytics.acceptanceStreakDays}d` },
          { label: 'Hardest Solved', value: hardestLabel },
          { label: 'Average Solve Time', value: avgSolveTime },
        ].map((item) => (
          <div key={item.label} style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ fontSize: 8, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{item.label}</div>
            <div style={{ fontSize: item.label === 'Hardest Solved' ? 11 : 18, color: '#ffffff', fontWeight: 800, marginTop: 6, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.value}>{item.value}</div>
          </div>
        ))}
      </div>

      <div 
        className={exportMode ? "" : "grid grid-cols-1 md:grid-cols-3 gap-3"}
        style={exportMode ? { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 } : undefined}
      >
        <div>
          <div style={{ fontSize: 9, color: '#06b6d4', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Topic Weakness Map</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {report.codingAnalytics.topicWeaknessMap.length === 0 ? (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>No weakness detected from logs.</div>
            ) : report.codingAnalytics.topicWeaknessMap.slice(0, 3).map((item) => (
              <div key={item.topic} style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(6,182,212,0.08)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.topic}</span>
                <span style={{ fontSize: 10, color: '#06b6d4', fontWeight: 800 }}>{item.outstandingCount}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 9, color: '#fb7185', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Revisit Failure List</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {report.codingAnalytics.revisitFailureList.length === 0 ? (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>No failed attempts logged.</div>
            ) : report.codingAnalytics.revisitFailureList.slice(0, 2).map((item) => (
              <div key={`${item.name}-${item.date}`} style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(244,63,94,0.08)', overflow: 'hidden' }}>
                <div style={{ fontSize: 10, color: '#ffffff', fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.name}</div>
                <div style={{ fontSize: 8, color: '#64748b', marginTop: 2, textTransform: 'uppercase', fontWeight: 700 }}>{item.difficulty} • {item.topic}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 9, color: '#a78bfa', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Spaced Repetition</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {report.codingAnalytics.spacedRepetitionQueue.length === 0 ? (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>Queue empty.</div>
            ) : report.codingAnalytics.spacedRepetitionQueue.slice(0, 2).map((item) => (
              <div key={`${item.name}-${item.date}`} style={{ padding: '8px 10px', borderRadius: 10, background: 'rgba(157, 23, 248, 0.04)', border: '1px solid rgba(167,139,250,0.08)', overflow: 'hidden' }}>
                <div style={{ fontSize: 10, color: '#ffffff', fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.name}</div>
                <div style={{ fontSize: 8, color: '#a78bfa', marginTop: 2, textTransform: 'uppercase', fontWeight: 800 }}>{item.difficulty} • {item.topic}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WeeklyIntelligenceReport({ report, exportMode = false }: { report: WeeklyReportStats; exportMode?: boolean }) {
  const pageGap = exportMode ? 24 : 28;
  const headerTone = toneColor(report.statusTone);
  const [activeReportTab, setActiveReportTab] = React.useState<'overview' | 'story' | 'analytics'>('overview');

  return (
    <ExportModeContext.Provider value={exportMode}>
      {exportMode ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: pageGap }} className="pdf-export-mode">
          <style dangerouslySetInnerHTML={{ __html: `
            /* Robust global styling overrides to enforce clean, modern executive typography in jsPDF captures */
            .pdf-export-mode,
            .pdf-export-mode * {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            }
            .pdf-export-mode text {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            }
            .pdf-export-mode .font-mono-only {
              font-family: 'JetBrains Mono', monospace !important;
            }
          ` }} />

          {/* Rigid A4 Page 1 - Executive Vital Statistics */}
          <div data-weekly-report-page="true" style={PAGE_STYLE}>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(255,255,255,0.02), transparent 20%, transparent 80%, rgba(255,255,255,0.01))' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
              <SectionTitle eyebrow="Your Week In Review" title="Personal Intelligence Report" subtitle={`${report.cycleStart} to ${report.cycleEnd}`} />
              <div style={{ ...glassCard, padding: '12px 14px', minWidth: 240, borderLeft: `3px solid ${headerTone}` }}>
                <div style={{ fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: headerTone, fontWeight: 800 }}>Weekly Status</div>
                <div style={{ fontSize: 16, fontWeight: 900, marginTop: 4, color: '#ffffff', letterSpacing: '-0.01em' }}>{report.statusLabel}</div>
                <div style={{ fontSize: 9, color: mutedText, marginTop: 4, lineHeight: 1.3 }}>Canonical activity logs synced.</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginTop: 15 }}>
              {report.heroMetrics.map((metric) => (
                <MetricCard key={metric.id} metric={metric} />
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 10, marginTop: 15 }}>
              <div style={{ ...glassCard, padding: '12px 14px', height: 170, boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Brain size={13} className="text-violet-400" />
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8' }}>Daily Focus</div>
                </div>
                <FocusBarChart points={report.dailyBreakdown} />
              </div>
              <div style={{ ...glassCard, padding: '12px 14px', height: 170, boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <MoonStar size={13} className="text-pink-400" />
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8' }}>Sleep Trend</div>
                </div>
                <SleepTrendChart points={report.dailyBreakdown} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 10, marginTop: 10 }}>
              <RingProgress current={report.totalWaterIntakeMl} total={3000 * 7} label="Hydration" valueLabel={`${report.waterAverageL}L/day`} accent="#38bdf8" />
              <div style={{ ...glassCard, padding: '12px 14px', height: 170, boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Flame size={13} className="text-rose-400" />
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8' }}>Calories In vs Out</div>
                </div>
                <CaloriesCompareChart points={report.dailyBreakdown} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              <div style={{ ...glassCard, padding: '12px 14px', height: 170, boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Footprints size={13} className="text-emerald-400" />
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8' }}>Weekly Steps Trend</div>
                </div>
                <SimpleLineChart points={report.dailyBreakdown} valueForPoint={(point) => point.steps} color="#34d399" />
              </div>
              <div style={{ ...glassCard, padding: '12px 14px', height: 170, boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <BookOpen size={13} className="text-amber-400" />
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8' }}>Reading Progress</div>
                </div>
                <SimpleLineChart points={report.dailyBreakdown} valueForPoint={(point) => point.readingChapters} color="#f59e0b" />
              </div>
            </div>

            <div style={{ position: 'absolute', bottom: 20, left: 40, right: 40, display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#475569', fontWeight: 600 }}>
              <span>Every metric in this report is derived from canonical Mani OS logs.</span>
              <span>Page 1</span>
            </div>
          </div>

          {/* Rigid A4 Page 2 - Narrative, Wins & Lifestyle Analytics */}
          <div data-weekly-report-page="true" style={PAGE_STYLE}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SectionTitle eyebrow="Personal Intelligence" title="The Week In Story Form" />
                <div style={{ ...glassCard, padding: '12px 14px', fontSize: 11, lineHeight: 1.4, color: '#cbd5e1', borderLeft: '3px solid #8b5cf6', boxSizing: 'border-box' }}>
                  {report.weeklyNarrative}
                </div>
              </div>
              <div style={{ ...glassCard, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, boxSizing: 'border-box' }}>
                <div style={{ fontSize: 8.5, color: '#38bdf8', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 800 }}>Strongest Day</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', marginTop: 2 }}>{report.strongestDayLabel}</div>
                <div style={{ fontSize: 10.5, color: mutedText, lineHeight: 1.35, marginTop: 4 }}>{report.strongestDayReason}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 15 }}>
              <div style={{ ...glassCard, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Code2 size={13} className="text-cyan-400" />
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8' }}>Coding Contribution Heatmap</div>
                </div>
                <CodingHeatmap points={report.dailyBreakdown} />
              </div>
              <div style={{ ...glassCard, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Trophy size={13} className="text-amber-400" />
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8' }}>Weekly Wins</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {report.wins.map((item, index) => (
                    <div key={index} style={{ fontSize: 10, lineHeight: 1.35, color: '#cbd5e1', padding: '6px 10px', borderRadius: 8, background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.06)', borderLeft: '3px solid #10b981' }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
              <div style={{ ...glassCard, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <AlertTriangle size={13} className="text-rose-400" />
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8' }}>Areas To Improve</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {report.risks.map((item, index) => (
                    <div key={index} style={{ fontSize: 10, lineHeight: 1.35, color: '#cbd5e1', padding: '6px 10px', borderRadius: 8, background: 'rgba(244,63,94,0.03)', border: '1px solid rgba(244,63,94,0.06)', borderLeft: '3px solid #f43f5e' }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ ...glassCard, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Dumbbell size={13} className="text-orange-400" />
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8' }}>Workout Timeline</div>
                </div>
                <WorkoutTimeline points={report.dailyBreakdown} />
              </div>
            </div>

            <div style={{ marginTop: 15 }}>
              <SectionTitle eyebrow="Week over week" title="Measured Deltas" subtitle={`${report.previousCycleStart} to ${report.previousCycleEnd} compared against the current cycle.`} />
              <div style={{ marginTop: 10 }}>
                <ComparisonTable rows={report.comparisonRows} />
              </div>
            </div>

            <div style={{ marginTop: 15 }}>
              <SectionTitle eyebrow="AI Insights" title="Only When Statistically Valid" />
              <div style={{ marginTop: 10 }}>
                <InsightBlock report={report} />
              </div>
            </div>

            <div style={{ position: 'absolute', bottom: 20, left: 40, right: 40, display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#475569', fontWeight: 600 }}>
              <span>Insights are withheld when the sample size or signal strength is weak.</span>
              <span>Page 2</span>
            </div>
          </div>

          {/* Rigid A4 Page 3 - Deep Dive Review */}
          <div data-weekly-report-page="true" style={PAGE_STYLE}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 14 }}>
              <SectionTitle eyebrow="Deep Dive" title="Weekly Review" subtitle="A drill-down of consistency, tracker performance, coding signals, and source-of-truth integrity." />
              <div style={{ ...glassCard, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, boxSizing: 'border-box' }}>
                <div style={{ fontSize: 8.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 800 }}>Traceability Matrix</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {report.metricSources.map((source) => (
                    <div key={source.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10, color: '#cbd5e1', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: 2 }}>
                      <span style={{ fontWeight: 600 }}>{source.label}</span>
                      <span style={{ color: '#64748b', fontFamily: 'monospace', fontSize: 9 }} className="font-mono-only">{source.source}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 12, marginTop: 15 }}>
              <div style={{ ...glassCard, padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, boxSizing: 'border-box' }}>
                <div style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Activity size={14} className="text-cyan-400" />
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8' }}>Performance Radar</div>
                </div>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                  <RadarChart metrics={report.radarMetrics} />
                </div>
              </div>
              <CodingAnalyticsPanel report={report} />
            </div>

            <div style={{ marginTop: 15 }}>
              <SectionTitle eyebrow="Custom Trackers" title="Milestones Logged" />
              <div style={{ marginTop: 10 }}>
                <TrackerCards cards={report.customTrackerCards} />
              </div>
            </div>

            <div style={{ marginTop: 15, ...glassCard, padding: 14, boxSizing: 'border-box' }}>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', marginBottom: 6 }}>Next Week Action Plan</div>
              <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(6,182,212,0.03)', border: '1px solid rgba(6,182,212,0.06)', fontSize: 10.5, lineHeight: 1.4, color: '#cbd5e1', marginBottom: 10 }}>
                Longest focus streak: <strong className="text-cyan-400">{report.longestFocusStreakDays} day(s)</strong>. Best coding streak: <strong className="text-cyan-400">{report.bestCodingStreakDays} day(s)</strong>.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                {report.actionPlan.map((item, index) => (
                  <div key={index} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ fontSize: 8, color: '#06b6d4', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Action {index + 1}</div>
                    <div style={{ fontSize: 10, color: '#cbd5e1', lineHeight: 1.35, marginTop: 4 }}>{item}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ position: 'absolute', bottom: 20, left: 40, right: 40, display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#475569', fontWeight: 600 }}>
              <span>Zero simulated values. Zero contradictory metrics. Export-ready premium intelligence.</span>
              <span>Page 3</span>
            </div>
          </div>
        </div>
      ) : (
        /* GORGEOUS PREMIUM RESPONSIVE APP UI */
        <div className="w-full text-slate-100 flex flex-col gap-6">
          {/* Premium Segmented Tab Selector */}
          <div className="flex flex-wrap p-1 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md self-start">
            {[
              { id: 'overview', label: 'Overview & Vitals', icon: Activity },
              { id: 'story', label: 'Narrative & Wins', icon: Sparkles },
              { id: 'analytics', label: 'Deep Dive & Plan', icon: Brain }
            ].map((t) => {
              const Icon = t.icon;
              const active = activeReportTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveReportTab(t.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all ${
                    active
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-500/10'
                      : 'text-white/40 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <Icon size={12} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Tab Contents */}
          <div className="w-full">
            {activeReportTab === 'overview' && (
              <div className="space-y-6">
                {/* Header info */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/5">
                  <SectionTitle eyebrow="Your Week In Review" title="Personal Intelligence Report" subtitle={`${report.cycleStart} to ${report.cycleEnd}`} />
                  <div className="glass-card p-5 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md min-w-[240px] hover:border-violet-500/20 transition-all duration-300">
                    <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: headerTone, fontWeight: 800 }}>Weekly Status</div>
                    <div className="text-2xl font-black mt-2 text-white">{report.statusLabel}</div>
                    <div className="text-xs text-slate-400 mt-2 leading-relaxed">{report.weeklyNarrative}</div>
                  </div>
                </div>

                {/* Hero metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
                  {report.heroMetrics.map((metric) => (
                    <MetricCard key={metric.id} metric={metric} />
                  ))}
                </div>

                {/* Focus and Sleep charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
                  <div className="glass-card p-6 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-md hover:border-violet-500/20 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <Brain size={16} className="text-violet-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-white/50">Daily Focus Time</span>
                    </div>
                    <div className="h-[180px] w-full flex items-center justify-center">
                      <FocusBarChart points={report.dailyBreakdown} />
                    </div>
                  </div>
                  <div className="glass-card p-6 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-md hover:border-violet-500/20 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <MoonStar size={16} className="text-pink-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-white/50">Sleep Trend</span>
                    </div>
                    <div className="h-[180px] w-full flex items-center justify-center">
                      <SleepTrendChart points={report.dailyBreakdown} />
                    </div>
                  </div>
                </div>

                {/* Hydration and Calories */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
                  <RingProgress current={report.totalWaterIntakeMl} total={3000 * 7} label="Hydration" valueLabel={`${report.waterAverageL}L/day`} accent="#38bdf8" />
                  <div className="glass-card p-6 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-md hover:border-violet-500/20 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <Flame size={16} className="text-rose-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-white/50">Calories In vs Out</span>
                    </div>
                    <div className="h-[180px] w-full flex items-center justify-center">
                      <CaloriesCompareChart points={report.dailyBreakdown} />
                    </div>
                  </div>
                </div>

                {/* Steps and Reading */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
                  <div className="glass-card p-6 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-md hover:border-violet-500/20 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <Footprints size={16} className="text-emerald-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-white/50">Weekly Steps Trend</span>
                    </div>
                    <div className="h-[180px] w-full flex items-center justify-center">
                      <SimpleLineChart points={report.dailyBreakdown} valueForPoint={(point) => point.steps} color="#34d399" />
                    </div>
                  </div>
                  <div className="glass-card p-6 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-md hover:border-violet-500/20 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <BookOpen size={16} className="text-amber-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-white/50">Reading Progress</span>
                    </div>
                    <div className="h-[180px] w-full flex items-center justify-center">
                      <SimpleLineChart points={report.dailyBreakdown} valueForPoint={(point) => point.readingChapters} color="#f59e0b" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeReportTab === 'story' && (
              <div className="space-y-6">
                {/* Header story */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6 border-b border-white/5">
                  <div className="lg:col-span-2 space-y-3">
                    <SectionTitle eyebrow="Personal Intelligence" title="The Week In Story Form" subtitle={report.weeklyNarrative} />
                  </div>
                  <div className="glass-card p-6 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-md hover:border-violet-500/20 transition-all duration-300">
                    <div className="text-[10px] text-cyan-400 tracking-wider uppercase font-black">Strongest Day</div>
                    <div className="text-xl font-black mt-2 text-white">{report.strongestDayLabel}</div>
                    <div className="text-xs text-slate-400 leading-relaxed mt-2">{report.strongestDayReason}</div>
                  </div>
                </div>

                {/* Heatmap and Wins */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
                  <div className="glass-card p-6 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-md hover:border-violet-500/20 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <Code2 size={16} className="text-cyan-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-white/50">Coding Contribution Heatmap</span>
                    </div>
                    <div className="flex justify-center py-2">
                      <CodingHeatmap points={report.dailyBreakdown} />
                    </div>
                  </div>
                  <div className="glass-card p-6 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-md hover:border-violet-500/20 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <Trophy size={16} className="text-amber-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-white/50">Weekly Wins</span>
                    </div>
                    <div className="space-y-3">
                      {report.wins.map((item, index) => (
                        <div key={index} className="text-xs leading-relaxed text-slate-200 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Risks and Workout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
                  <div className="glass-card p-6 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-md hover:border-violet-500/20 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle size={16} className="text-rose-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-white/50">Areas To Improve</span>
                    </div>
                    <div className="space-y-3">
                      {report.risks.map((item, index) => (
                        <div key={index} className="text-xs leading-relaxed text-slate-200 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="glass-card p-6 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-md hover:border-violet-500/20 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <Dumbbell size={16} className="text-orange-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-white/50">Workout Timeline</span>
                    </div>
                    <WorkoutTimeline points={report.dailyBreakdown} />
                  </div>
                </div>

                {/* Deltas and AI insights */}
                <div className="mt-8 space-y-6">
                  <div>
                    <SectionTitle eyebrow="Week over week" title="Measured Deltas" subtitle={`${report.previousCycleStart} to ${report.previousCycleEnd} compared against the current cycle.`} />
                    <div className="mt-4">
                      <ComparisonTable rows={report.comparisonRows} />
                    </div>
                  </div>
                  <div>
                    <SectionTitle eyebrow="AI Insights" title="Only When Statistically Valid" />
                    <div className="mt-4">
                      <InsightBlock report={report} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeReportTab === 'analytics' && (
              <div className="space-y-6">
                {/* Header Review */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6 border-b border-white/5">
                  <div className="lg:col-span-2 space-y-3">
                    <SectionTitle eyebrow="Deep Dive" title="Weekly Review" subtitle="A drill-down of consistency, tracker performance, coding signals, and source-of-truth integrity." />
                  </div>
                  <div className="glass-card p-5 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md hover:border-violet-500/20 transition-all duration-300 flex flex-col gap-2">
                    <div className="text-[10px] tracking-[0.22em] uppercase text-[#38bdf8] font-black">Traceability</div>
                    {report.metricSources.map((source) => (
                      <div key={source.id} className="flex justify-between gap-12 text-[11px] text-slate-300">
                        <span>{source.label}</span>
                        <span style={{ color: mutedText }} className="font-semibold">{source.source}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Radar and Coding Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                  <div className="glass-card p-6 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-md hover:border-violet-500/20 transition-all duration-300 flex flex-col items-center gap-4">
                    <div className="w-full flex items-center gap-2">
                      <Activity size={16} className="text-cyan-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-white/50">Performance Radar</span>
                    </div>
                    <div className="w-full flex justify-center py-2">
                      <RadarChart metrics={report.radarMetrics} />
                    </div>
                  </div>
                  <div className="lg:col-span-2">
                    <CodingAnalyticsPanel report={report} />
                  </div>
                </div>

                {/* Custom trackers milestones */}
                <div className="mt-8">
                  <SectionTitle eyebrow="Custom Trackers" title="Milestones Logged" />
                  <div className="mt-4">
                    <TrackerCards cards={report.customTrackerCards} />
                  </div>
                </div>

                {/* Action Plan */}
                <div className="mt-8 glass-card p-6 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-md hover:border-violet-500/20 transition-all duration-300">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400 mb-4">Next Week Action Plan</div>
                  <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 text-xs leading-relaxed text-slate-200 mb-5">
                    Longest focus streak: <strong className="text-cyan-400">{report.longestFocusStreakDays} day(s)</strong>. Best coding streak: <strong className="text-cyan-400">{report.bestCodingStreakDays} day(s)</strong>.
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {report.actionPlan.map((item, index) => (
                      <div key={index} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-violet-500/20 hover:bg-white/[0.05] transition-all">
                        <div className="text-[10px] text-cyan-400 font-black tracking-widest uppercase">Action {index + 1}</div>
                        <div className="text-xs text-slate-300 leading-relaxed mt-2">{item}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </ExportModeContext.Provider>
  );
}
