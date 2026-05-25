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
  minHeight: 1123,
  background: 'radial-gradient(circle at top right, rgba(99,102,241,0.18), transparent 30%), radial-gradient(circle at top left, rgba(14,165,233,0.12), transparent 28%), linear-gradient(180deg, #07111f 0%, #050913 52%, #03050b 100%)',
  color: '#f8fafc',
  borderRadius: 28,
  padding: 42,
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 24px 60px rgba(2, 8, 23, 0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
  border: '1px solid rgba(148,163,184,0.14)',
};

const glassCard: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(15,23,42,0.9), rgba(15,23,42,0.6))',
  border: '1px solid rgba(148,163,184,0.16)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  backdropFilter: 'blur(12px)',
  borderRadius: 24,
};

const ExportModeContext = React.createContext(false);

function getCardProps(exportMode: boolean, padding: string | number = 20) {
  return {
    style: exportMode ? { ...glassCard, padding } : { padding },
    className: exportMode ? "" : "glass-card hover:border-violet-500/20 transition-all duration-300 shadow-lg bg-white/[0.02] backdrop-blur-md border border-white/5 rounded-3xl",
  };
}

const mutedText = '#94a3b8';
const titleText = '#e2e8f0';

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}%`;
  if (delta < 0) return `${delta}%`;
  return '0%';
}

function directionIcon(direction: 'up' | 'down' | 'flat') {
  if (direction === 'up') return <TrendingUp size={12} />;
  if (direction === 'down') return <TrendingDown size={12} />;
  return <Minus size={12} />;
}

function directionColor(direction: 'up' | 'down' | 'flat') {
  if (direction === 'up') return '#34d399';
  if (direction === 'down') return '#f87171';
  return '#cbd5e1';
}

function toneColor(tone: WeeklyReportStats['statusTone']): string {
  if (tone === 'emerald') return '#34d399';
  if (tone === 'amber') return '#fbbf24';
  if (tone === 'rose') return '#fb7185';
  return '#a78bfa';
}

function SectionTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#7dd3fc', fontWeight: 800 }}>{eyebrow}</div>
      <div style={{ fontSize: 26, lineHeight: 1.05, fontWeight: 900, color: titleText }}>{title}</div>
      {subtitle ? <div style={{ fontSize: 12, lineHeight: 1.5, color: mutedText, maxWidth: 520 }}>{subtitle}</div> : null}
    </div>
  );
}

function MetricCard({ metric }: { metric: ReportMetricCard }) {
  const deltaColor = directionColor(metric.direction);
  const exportMode = React.useContext(ExportModeContext);
  return (
    <div 
      {...getCardProps(exportMode, '18px 18px 16px')}
      style={exportMode ? { ...glassCard, padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 10 } : { padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: mutedText, fontWeight: 800 }}>{metric.label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: deltaColor, fontSize: 11, fontWeight: 700 }}>
          {directionIcon(metric.direction)}
          <span>{formatDelta(metric.deltaPct)}</span>
        </div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1, color: '#ffffff' }}>{metric.value}</div>
      <div style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 600 }}>{metric.subtitle}</div>
      <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.max(4, Math.min(metric.progressPct ?? 0, 100))}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #38bdf8, #8b5cf6 60%, #f472b6)',
            borderRadius: 999,
            boxShadow: '0 0 16px rgba(99,102,241,0.28)',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 10, color: mutedText }}>
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
  const barWidth = width / points.length - 14;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ minHeight: 140 }}>
      {points.map((point, index) => {
        const x = index * (width / points.length) + 10;
        const barHeight = Math.max(10, (point.focusMinutes / max) * 100);
        const y = height - barHeight - 24;
        return (
          <g key={point.date}>
            <rect x={x} y={height - 112} width={barWidth} height={112} rx={16} fill="rgba(255,255,255,0.03)" />
            <rect x={x} y={y} width={barWidth} height={barHeight} rx={16} fill="url(#focusBarGradient)" />
            <text x={x + barWidth / 2} y={height - 8} fill="#94a3b8" fontSize="10" textAnchor="middle">{point.shortLabel}</text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="focusBarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
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

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ minHeight: 140 }}>
      <path d={path} fill="none" stroke="#f472b6" strokeWidth="3" strokeLinecap="round" />
      {plotted.map((point, index) => (
        <g key={points[index].date}>
          <circle cx={point.x} cy={point.y} r="4.5" fill="#f8fafc" stroke="#f472b6" strokeWidth="2" />
          <text x={point.x} y={height - 8} fill="#94a3b8" fontSize="10" textAnchor="middle">{points[index].shortLabel}</text>
        </g>
      ))}
    </svg>
  );
}

function RingProgress({ current, total, label, valueLabel, accent }: { current: number; total: number; label: string; valueLabel: string; accent: string }) {
  const radius = 50;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth;
  const circumference = normalizedRadius * 2 * Math.PI;
  const pct = total > 0 ? Math.min(current / total, 1) : 0;
  const strokeDashoffset = circumference - pct * circumference;
  const exportMode = React.useContext(ExportModeContext);

  return (
    <div 
      {...getCardProps(exportMode, 20)}
      style={exportMode ? { ...glassCard, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 } : { padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}
    >
      <div>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: mutedText, fontWeight: 800 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{valueLabel}</div>
        <div style={{ fontSize: 11, color: mutedText, marginTop: 6 }}>{Math.round(pct * 100)}% of target</div>
      </div>
      <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)' }}>
        <circle stroke="rgba(255,255,255,0.08)" fill="transparent" strokeWidth={strokeWidth} r={normalizedRadius} cx={radius} cy={radius} />
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
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ minHeight: 140 }}>
      {points.map((point, index) => {
        const x = index * groupWidth + 8;
        const intakeHeight = Math.max(6, (point.caloriesIn / max) * 94);
        const burnHeight = Math.max(6, (point.caloriesOut / max) * 94);
        return (
          <g key={point.date}>
            <rect x={x} y={height - intakeHeight - 30} width={12} height={intakeHeight} rx={6} fill="#fb7185" />
            <rect x={x + 16} y={height - burnHeight - 30} width={12} height={burnHeight} rx={6} fill="#fb923c" />
            <text x={x + 13} y={height - 10} fill="#94a3b8" fontSize="10" textAnchor="middle">{point.shortLabel}</text>
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
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ minHeight: 140 }}>
      <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
      {plotted.map((point, index) => (
        <g key={points[index].date}>
          <circle cx={point.x} cy={point.y} r="4.5" fill="#f8fafc" stroke={color} strokeWidth="2" />
          <text x={point.x} y={height - 8} fill="#94a3b8" fontSize="10" textAnchor="middle">{points[index].shortLabel}</text>
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
      style={exportMode ? { display: 'grid', gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`, gap: 12 } : undefined}
    >
      {points.map((point) => {
        const intensity = Math.min(point.codingSolved, 4);
        const background = intensity === 0
          ? 'rgba(255,255,255,0.04)'
          : intensity === 1
          ? 'rgba(34,211,238,0.18)'
          : intensity === 2
          ? 'rgba(34,211,238,0.35)'
          : intensity === 3
          ? 'rgba(59,130,246,0.55)'
          : 'rgba(14,165,233,0.82)';
        return (
          <div key={point.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
              {point.codingSolved > 0 ? point.codingSolved : ''}
            </div>
            <div style={{ fontSize: 10, color: mutedText, fontWeight: 700 }}>{point.shortLabel}</div>
          </div>
        );
      })}
    </div>
  );
}

function WorkoutTimeline({ points }: { points: DailyReportPoint[] }) {
  const exportMode = React.useContext(ExportModeContext);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {points.map((point) => (
        <div 
          key={point.date} 
          {...getCardProps(exportMode, '14px 16px')}
          style={exportMode ? { ...glassCard, padding: '14px 16px', display: 'grid', gridTemplateColumns: '92px 1fr auto', gap: 14, alignItems: 'center' } : { padding: '14px 16px', display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center' }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: '#cbd5e1' }}>{point.shortLabel}</div>
          <div style={{ fontSize: 12, color: point.workoutCount > 0 ? '#f8fafc' : mutedText, fontWeight: 600 }}>
            {point.workoutCount > 0 ? point.workoutNames.join(' • ') : 'No workout logged'}
          </div>
          <div style={{ fontSize: 11, color: '#fb923c', fontWeight: 800 }}>{point.workoutMinutes} min</div>
        </div>
      ))}
    </div>
  );
}

function RadarChart({ metrics }: { metrics: RadarMetric[] }) {
  const size = 260;
  const center = size / 2;
  const radius = 86;
  const angleStep = (Math.PI * 2) / metrics.length;
  const exportMode = React.useContext(ExportModeContext);

  const polygon = metrics.map((metric, index) => {
    const angle = -Math.PI / 2 + angleStep * index;
    const distance = radius * (metric.value / 100);
    return `${center + Math.cos(angle) * distance},${center + Math.sin(angle) * distance}`;
  }).join(' ');

  return (
    <svg width={exportMode ? size : "100%"} height={exportMode ? size : "100%"} viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: size, margin: '0 auto' }}>
      {[25, 50, 75, 100].map((ring) => {
        const points = metrics.map((_, index) => {
          const angle = -Math.PI / 2 + angleStep * index;
          const distance = radius * (ring / 100);
          return `${center + Math.cos(angle) * distance},${center + Math.sin(angle) * distance}`;
        }).join(' ');
        return <polygon key={ring} points={points} fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="1" />;
      })}
      {metrics.map((metric, index) => {
        const angle = -Math.PI / 2 + angleStep * index;
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        const labelX = center + Math.cos(angle) * (radius + 24);
        const labelY = center + Math.sin(angle) * (radius + 24);
        return (
          <g key={metric.label}>
            <line x1={center} y1={center} x2={x} y2={y} stroke="rgba(148,163,184,0.16)" />
            <text x={labelX} y={labelY} fill="#cbd5e1" fontSize="11" textAnchor="middle">{metric.label}</text>
          </g>
        );
      })}
      <polygon points={polygon} fill="rgba(56,189,248,0.18)" stroke="#38bdf8" strokeWidth="2.5" />
    </svg>
  );
}

function ComparisonTable({ rows }: { rows: WeeklyComparisonRow[] }) {
  const exportMode = React.useContext(ExportModeContext);
  return (
    <div 
      className={exportMode ? "" : "grid grid-cols-1 md:grid-cols-2 gap-4"}
      style={exportMode ? { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 } : undefined}
    >
      {rows.map((row) => (
        <div 
          key={row.id} 
          {...getCardProps(exportMode, '16px 18px')}
          style={exportMode ? { ...glassCard, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 } : { padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: mutedText, fontWeight: 800 }}>{row.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: directionColor(row.direction), fontSize: 11, fontWeight: 800 }}>
              {directionIcon(row.direction)}
              {formatDelta(row.deltaPct)}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, fontWeight: 700 }}>
            <span style={{ color: '#f8fafc' }}>{row.currentValue}</span>
            <span style={{ color: mutedText }}>Prev {row.previousValue}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function InsightBlock({ report }: { report: WeeklyReportStats }) {
  const exportMode = React.useContext(ExportModeContext);
  if (report.validatedInsights.length === 0) {
    return (
      <div 
        {...getCardProps(exportMode, 22)}
        style={exportMode ? { ...glassCard, padding: 22, display: 'flex', alignItems: 'center', gap: 12 } : { padding: 22, display: 'flex', alignItems: 'center', gap: 12 }}
      >
        <ShieldCheck size={20} color="#38bdf8" />
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#f8fafc' }}>AI Insights</div>
          <div style={{ fontSize: 12, color: mutedText }}>{report.insightsFallback}</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={exportMode ? "" : "grid grid-cols-1 md:grid-cols-2 gap-4"}
      style={exportMode ? { display: 'grid', gridTemplateColumns: `repeat(${report.validatedInsights.length}, minmax(0, 1fr))`, gap: 14 } : undefined}
    >
      {report.validatedInsights.map((insight) => (
        <div 
          key={insight.id} 
          {...getCardProps(exportMode, 20)}
          style={exportMode ? { ...glassCard, padding: 20, display: 'flex', flexDirection: 'column', gap: 8 } : { padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#38bdf8', fontWeight: 800 }}>{insight.confidence} confidence</div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>{insight.title}</div>
          <div style={{ fontSize: 12, lineHeight: 1.6, color: '#cbd5e1' }}>{insight.body}</div>
          <div style={{ fontSize: 10, color: mutedText }}>{insight.source}</div>
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
        {...getCardProps(exportMode, 18)}
        style={exportMode ? { ...glassCard, padding: 18, color: mutedText, fontSize: 12 } : { padding: 18, color: mutedText, fontSize: 12 }}
      >
        No custom tracker activity was logged in this cycle.
      </div>
    );
  }

  return (
    <div 
      className={exportMode ? "" : "grid grid-cols-1 md:grid-cols-2 gap-4"}
      style={exportMode ? { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 } : undefined}
    >
      {cards.map((card) => {
        const progress = card.target ? Math.min((card.completedCount / card.target) * 100, 100) : Math.min((card.completedCount / Math.max(card.totalLogged, 1)) * 100, 100);
        return (
          <div 
            key={card.trackerId} 
            {...getCardProps(exportMode, 18)}
            style={exportMode ? { ...glassCard, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 } : { padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{card.title}</div>
                <div style={{ fontSize: 10, color: mutedText, textTransform: 'uppercase', letterSpacing: '0.16em', marginTop: 4 }}>{card.type}</div>
              </div>
              <div style={{ fontSize: 12, color: '#38bdf8', fontWeight: 800 }}>{card.streakDays}d streak</div>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(4, progress)}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #22d3ee, #8b5cf6)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11, color: '#cbd5e1' }}>
              <span>{card.milestoneText}</span>
              <span>{card.avgValue !== undefined ? `${card.avgValue.toFixed(1)}${card.unit ? ` ${card.unit}` : ''} avg` : `${card.totalLogged} logs`}</span>
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
      {...getCardProps(exportMode, 20)}
      style={exportMode ? { ...glassCard, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 } : { padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Code2 size={16} color="#38bdf8" />
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: mutedText }}>Coding Intelligence</div>
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
          <div key={item.label} style={{ padding: '12px 14px', borderRadius: 18, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 10, color: mutedText, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em' }}>{item.label}</div>
            <div style={{ fontSize: item.label === 'Hardest Solved' ? 12 : 20, color: '#f8fafc', fontWeight: 800, marginTop: 8, lineHeight: 1.35 }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div 
        className={exportMode ? "" : "grid grid-cols-1 md:grid-cols-3 gap-3"}
        style={exportMode ? { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 } : undefined}
      >
        <div>
          <div style={{ fontSize: 10, color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 8 }}>Topic Weakness Map</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {report.codingAnalytics.topicWeaknessMap.length === 0 ? (
              <div style={{ fontSize: 11, color: mutedText }}>No outstanding topic weakness detected from logged attempts.</div>
            ) : report.codingAnalytics.topicWeaknessMap.map((item) => (
              <div key={item.topic} style={{ padding: '10px 12px', borderRadius: 16, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(56,189,248,0.14)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 700 }}>{item.topic}</span>
                <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 800 }}>{item.outstandingCount}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, color: '#fb7185', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 8 }}>Revisit Failure List</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {report.codingAnalytics.revisitFailureList.length === 0 ? (
              <div style={{ fontSize: 11, color: mutedText }}>No failed or incomplete coding logs in this cycle.</div>
            ) : report.codingAnalytics.revisitFailureList.map((item) => (
              <div key={`${item.name}-${item.date}`} style={{ padding: '10px 12px', borderRadius: 16, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(244,63,94,0.14)' }}>
                <div style={{ fontSize: 11, color: '#f8fafc', fontWeight: 700 }}>{item.name}</div>
                <div style={{ fontSize: 10, color: mutedText, marginTop: 4 }}>{item.difficulty} • {item.topic} • {item.date}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, color: '#a78bfa', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 8 }}>Spaced Repetition Queue</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {report.codingAnalytics.spacedRepetitionQueue.length === 0 ? (
              <div style={{ fontSize: 11, color: mutedText }}>No timed or non-easy solves were logged for revisit scheduling.</div>
            ) : report.codingAnalytics.spacedRepetitionQueue.map((item) => (
              <div key={`${item.name}-${item.date}`} style={{ padding: '10px 12px', borderRadius: 16, background: 'rgba(167,139,250,0.14)' }}>
                <div style={{ fontSize: 11, color: '#f8fafc', fontWeight: 700 }}>{item.name}</div>
                <div style={{ fontSize: 10, color: mutedText, marginTop: 4 }}>{item.difficulty} • {item.topic} • {item.date}</div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: pageGap }}>
          <div data-weekly-report-page="true" style={PAGE_STYLE}>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(255,255,255,0.03), transparent 18%, transparent 82%, rgba(255,255,255,0.02))' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
              <SectionTitle eyebrow="Your Week In Review" title="Personal Intelligence Report" subtitle={`${report.cycleStart} to ${report.cycleEnd}`} />
              <div style={{ ...glassCard, padding: '16px 18px', minWidth: 210 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: headerTone, fontWeight: 800 }}>Weekly Status</div>
                <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>{report.statusLabel}</div>
                <div style={{ fontSize: 12, color: mutedText, marginTop: 8 }}>{report.weeklyNarrative}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginTop: 24 }}>
              {report.heroMetrics.map((metric) => (
                <MetricCard key={metric.id} metric={metric} />
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 16, marginTop: 18 }}>
              <div style={{ ...glassCard, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Brain size={16} color="#8b5cf6" />
                  <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: mutedText }}>Daily Focus</div>
                </div>
                <FocusBarChart points={report.dailyBreakdown} />
              </div>
              <div style={{ ...glassCard, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <MoonStar size={16} color="#f472b6" />
                  <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: mutedText }}>Sleep Trend</div>
                </div>
                <SleepTrendChart points={report.dailyBreakdown} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '0.95fr 1.15fr', gap: 16, marginTop: 16 }}>
              <RingProgress current={report.totalWaterIntakeMl} total={3000 * 7} label="Hydration" valueLabel={`${report.waterAverageL}L/day`} accent="#38bdf8" />
              <div style={{ ...glassCard, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Flame size={16} color="#fb7185" />
                  <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: mutedText }}>Calories In vs Out</div>
                </div>
                <CaloriesCompareChart points={report.dailyBreakdown} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
              <div style={{ ...glassCard, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Footprints size={16} color="#34d399" />
                  <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: mutedText }}>Weekly Steps Trend</div>
                </div>
                <SimpleLineChart points={report.dailyBreakdown} valueForPoint={(point) => point.steps} color="#34d399" />
              </div>
              <div style={{ ...glassCard, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <BookOpen size={16} color="#f59e0b" />
                  <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: mutedText }}>Reading Progress</div>
                </div>
                <SimpleLineChart points={report.dailyBreakdown} valueForPoint={(point) => point.readingChapters} color="#f59e0b" />
              </div>
            </div>

            <div style={{ position: 'absolute', bottom: 28, left: 42, right: 42, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: mutedText }}>
              <span>Every metric in this report is derived from canonical Mani OS logs.</span>
              <span>Page 1</span>
            </div>
          </div>

          <div data-weekly-report-page="true" style={PAGE_STYLE}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 18 }}>
              <SectionTitle eyebrow="Personal Intelligence" title="The Week In Story Form" subtitle={report.weeklyNarrative} />
              <div style={{ ...glassCard, padding: 20 }}>
                <div style={{ fontSize: 10, color: '#38bdf8', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 800 }}>Strongest Day</div>
                <div style={{ fontSize: 20, fontWeight: 900, marginTop: 8 }}>{report.strongestDayLabel}</div>
                <div style={{ fontSize: 12, color: mutedText, marginTop: 8 }}>{report.strongestDayReason}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
              <div style={{ ...glassCard, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Code2 size={16} color="#38bdf8" />
                  <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: mutedText }}>Coding Contribution Heatmap</div>
                </div>
                <CodingHeatmap points={report.dailyBreakdown} />
              </div>
              <div style={{ ...glassCard, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Trophy size={16} color="#f59e0b" />
                  <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: mutedText }}>Weekly Wins</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {report.wins.map((item, index) => (
                    <div key={index} style={{ fontSize: 12, lineHeight: 1.6, color: '#e2e8f0', padding: '12px 14px', borderRadius: 18, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.16)' }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
              <div style={{ ...glassCard, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <AlertTriangle size={16} color="#fb7185" />
                  <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: mutedText }}>Areas To Improve</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {report.risks.map((item, index) => (
                    <div key={index} style={{ fontSize: 12, lineHeight: 1.6, color: '#e2e8f0', padding: '12px 14px', borderRadius: 18, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.16)' }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ ...glassCard, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Dumbbell size={16} color="#fb923c" />
                  <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: mutedText }}>Workout Timeline</div>
                </div>
                <WorkoutTimeline points={report.dailyBreakdown} />
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <SectionTitle eyebrow="Week over week" title="Measured Deltas" subtitle={`${report.previousCycleStart} to ${report.previousCycleEnd} compared against the current cycle.`} />
              <div style={{ marginTop: 16 }}>
                <ComparisonTable rows={report.comparisonRows} />
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <SectionTitle eyebrow="AI Insights" title="Only When Statistically Valid" />
              <div style={{ marginTop: 14 }}>
                <InsightBlock report={report} />
              </div>
            </div>

            <div style={{ position: 'absolute', bottom: 28, left: 42, right: 42, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: mutedText }}>
              <span>Insights are withheld when the sample size or signal strength is weak.</span>
              <span>Page 2</span>
            </div>
          </div>

          <div data-weekly-report-page="true" style={PAGE_STYLE}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <SectionTitle eyebrow="Deep Dive" title="Weekly Review" subtitle="A drill-down of consistency, tracker performance, coding signals, and source-of-truth integrity." />
              <div style={{ ...glassCard, padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#38bdf8', fontWeight: 800 }}>Traceability</div>
                {report.metricSources.map((source) => (
                  <div key={source.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 11, color: '#cbd5e1' }}>
                    <span>{source.label}</span>
                    <span style={{ color: mutedText }}>{source.source}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 16, marginTop: 20 }}>
              <div style={{ ...glassCard, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={16} color="#38bdf8" />
                  <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: mutedText }}>Performance Radar</div>
                </div>
                <RadarChart metrics={report.radarMetrics} />
              </div>
              <CodingAnalyticsPanel report={report} />
            </div>

            <div style={{ marginTop: 16 }}>
              <SectionTitle eyebrow="Custom Trackers" title="Beautifully Reported Milestones" />
              <div style={{ marginTop: 14 }}>
                <TrackerCards cards={report.customTrackerCards} />
              </div>
            </div>

            <div style={{ marginTop: 16, ...glassCard, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: mutedText, marginBottom: 10 }}>Next Week Action Plan</div>
              <div style={{ padding: '12px 14px', borderRadius: 18, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.16)', fontSize: 12, lineHeight: 1.6, color: '#e2e8f0', marginBottom: 12 }}>
                Longest focus streak: {report.longestFocusStreakDays} day(s). Best coding streak: {report.bestCodingStreakDays} day(s).
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                {report.actionPlan.map((item, index) => (
                  <div key={index} style={{ padding: '14px 16px', borderRadius: 18, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: 10, color: '#38bdf8', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Action {index + 1}</div>
                    <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.6, marginTop: 8 }}>{item}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ position: 'absolute', bottom: 28, left: 42, right: 42, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: mutedText }}>
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
