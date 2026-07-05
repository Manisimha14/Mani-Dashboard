import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Database, Wifi, WifiOff, HardDrive, Activity,
  Clock, Shield, Cpu, BarChart3, Zap, Server,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getAppVersion } from '../../lib/appVersion';
import DevObservatoryPanel from '../ail/DevObservatoryPanel';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface SystemHudOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StorageKeyInfo {
  key: string;
  sizeKB: number;
}

interface MetricSnapshot {
  // Storage
  totalStorageKB: number;
  quotaKB: number;
  storagePercent: number;
  keyBreakdown: StorageKeyInfo[];
  // Database
  dbCounts: Record<string, number>;
  totalRecords: number;
  // Network
  isOnline: boolean;
  hasSupabase: boolean;
  // Session
  appVersion: string;
  uptimeSeconds: number;
  lastBackup: string | null;
  xp: number;
  level: number;
  // Performance
  heapUsedMB: number | null;
  heapTotalMB: number | null;
  heapLimitMB: number | null;
  pageLoadMs: number | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const STORAGE_QUOTA_KB = 5 * 1024; // 5 MB
const REFRESH_INTERVAL_MS = 2000;
const TRACKED_STORAGE_KEYS = ['dashboard-storage', 'health-storage-v2', 'backupSnapshots'];

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Calculate the byte size of a string in UTF-16 (localStorage encoding) */
function byteSize(str: string): number {
  return str.length * 2; // JavaScript UTF-16 strings take 2 bytes per code unit
}

/** Format bytes as a human-readable KB string */
function formatKB(kb: number): string {
  if (kb >= 1024) return `${(kb / 1024).toFixed(2)} MB`;
  return `${kb.toFixed(1)} KB`;
}

/** Format seconds into HH:MM:SS */
function formatUptime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Return a status color class based on percentage thresholds */
function statusColor(percent: number): string {
  if (percent < 50) return 'text-emerald-400';
  if (percent < 80) return 'text-amber-400';
  return 'text-red-400';
}

/** Collect all metrics in a single pass */
function collectMetrics(sessionStart: number, storeState: ReturnType<typeof useAppStore.getState>): MetricSnapshot {
  // ── Storage ──
  let totalBytes = 0;
  const keyBreakdown: StorageKeyInfo[] = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const value = localStorage.getItem(key) ?? '';
      const size = byteSize(key) + byteSize(value);
      totalBytes += size;

      if (TRACKED_STORAGE_KEYS.includes(key)) {
        keyBreakdown.push({ key, sizeKB: size / 1024 });
      }
    }
  } catch {
    // Storage access may fail in some contexts
  }

  // Add any tracked keys not found (show as 0)
  for (const k of TRACKED_STORAGE_KEYS) {
    if (!keyBreakdown.find(kb => kb.key === k)) {
      keyBreakdown.push({ key: k, sizeKB: 0 });
    }
  }

  const totalStorageKB = totalBytes / 1024;
  const storagePercent = (totalStorageKB / STORAGE_QUOTA_KB) * 100;

  // ── Database (Zustand) ──
  const dbCounts: Record<string, number> = {
    problems: storeState.problems.length,
    focusSessions: storeState.focusSessions.length,
    trackers: storeState.trackers.length,
    achievements: storeState.achievements.length,
    reminders: storeState.reminders.length,
    notifications: storeState.notifications.length,
    dailyActivity: storeState.dailyActivity.length,
  };
  const totalRecords = Object.values(dbCounts).reduce((a, b) => a + b, 0);

  // ── Network ──
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const hasSupabase = Boolean(import.meta.env.VITE_SUPABASE_URL);

  // ── Session ──
  const appVersion = getAppVersion();
  const uptimeSeconds = (Date.now() - sessionStart) / 1000;
  const lastBackup = storeState.lastBackupAt ?? null;
  const { xp, level } = storeState;

  // ── Performance ──
  let heapUsedMB: number | null = null;
  let heapTotalMB: number | null = null;
  let heapLimitMB: number | null = null;

  const perfMemory = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  if (perfMemory) {
    heapUsedMB = perfMemory.usedJSHeapSize / (1024 * 1024);
    heapTotalMB = perfMemory.totalJSHeapSize / (1024 * 1024);
    heapLimitMB = perfMemory.jsHeapSizeLimit / (1024 * 1024);
  }

  let pageLoadMs: number | null = null;
  try {
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (navEntries.length > 0) {
      pageLoadMs = navEntries[0].loadEventEnd - navEntries[0].startTime;
    }
  } catch {
    // Not available
  }

  return {
    totalStorageKB,
    quotaKB: STORAGE_QUOTA_KB,
    storagePercent,
    keyBreakdown,
    dbCounts,
    totalRecords,
    isOnline,
    hasSupabase,
    appVersion,
    uptimeSeconds,
    lastBackup,
    xp,
    level,
    heapUsedMB,
    heapTotalMB,
    heapLimitMB,
    pageLoadMs,
  };
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

/** A single metric card panel */
const MetricPanel: React.FC<{
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}> = ({ icon, label, children }) => (
  <div className="glass-card border border-emerald-500/10 bg-black/40 rounded-lg p-4 backdrop-blur-sm">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-emerald-400/70">{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/60">
        {label}
      </span>
    </div>
    <div className="space-y-2">{children}</div>
  </div>
);

/** A horizontal bar indicator */
const BarIndicator: React.FC<{ percent: number; color?: string }> = ({ percent, color }) => {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const barColor = color ?? (clampedPercent < 50 ? 'bg-emerald-400' : clampedPercent < 80 ? 'bg-amber-400' : 'bg-red-400');
  return (
    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-1">
      <motion.div
        className={`h-full rounded-full ${barColor}`}
        initial={{ width: 0 }}
        animate={{ width: `${clampedPercent}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
};

/** A single metric row inside a panel */
const MetricRow: React.FC<{
  label: string;
  value: string;
  colorClass?: string;
}> = ({ label, value, colorClass = 'text-cyan-400' }) => (
  <div className="flex items-center justify-between text-xs">
    <span className="text-white/40 font-mono">{label}</span>
    <span className={`font-mono font-bold ${colorClass}`}>{value}</span>
  </div>
);

/** Inline status dot */
const StatusDot: React.FC<{ active: boolean; label: string }> = ({ active, label }) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="relative flex h-2.5 w-2.5">
      {active && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      )}
      <span
        className={`relative inline-flex rounded-full h-2.5 w-2.5 ${active ? 'bg-emerald-400' : 'bg-red-400'}`}
      />
    </span>
    <span className={`font-mono ${active ? 'text-emerald-400' : 'text-red-400'}`}>{label}</span>
  </div>
);

// ─── Main Component ─────────────────────────────────────────────────────────────

/**
 * Cyber HUD Diagnostic Panel — a fullscreen overlay showing real-time
 * system telemetry: storage, database, network, session, and performance.
 *
 * Toggle with `Ctrl+Shift+H`. Auto-refreshes every 2 seconds.
 */
const SystemHudOverlay: React.FC<SystemHudOverlayProps> = ({ isOpen, onClose }) => {
  const sessionStartRef = useRef(Date.now());
  const [metrics, setMetrics] = useState<MetricSnapshot | null>(null);
  const [tick, setTick] = useState(0);

  // Refresh loop
  useEffect(() => {
    if (!isOpen) return;

    const refresh = () => {
      const state = useAppStore.getState();
      setMetrics(collectMetrics(sessionStartRef.current, state));
    };

    refresh(); // immediate
    const id = setInterval(() => {
      refresh();
      setTick(t => t + 1);
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(id);
  }, [isOpen]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Memoised formatted uptime string
  const uptimeStr = useMemo(
    () => (metrics ? formatUptime(metrics.uptimeSeconds) : '00:00:00'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, metrics?.uptimeSeconds],
  );

  if (!metrics) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="system-hud"
          className="fixed inset-0 z-[300] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Scanline overlay effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]">
            <div
              className="w-full h-full opacity-[0.03]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,150,0.08) 2px, rgba(0,255,150,0.08) 4px)',
                animation: 'hud-scanline 8s linear infinite',
              }}
            />
          </div>

          {/* Main panel */}
          <motion.div
            className="relative z-[2] w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto rounded-2xl border border-emerald-500/20 bg-black/90 backdrop-blur-xl shadow-2xl shadow-emerald-500/5"
            initial={{ scale: 0.92, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-emerald-500/10 bg-black/80 backdrop-blur-sm rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Cpu size={18} className="text-emerald-400" />
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.15em] text-emerald-400">
                    System Diagnostics
                  </h2>
                  <p className="text-[10px] font-mono text-white/30 mt-0.5">
                    MANI OS v{metrics.appVersion} • HUD TELEMETRY FEED
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-flex text-[10px] font-mono text-white/20 border border-white/10 rounded px-2 py-1">
                  Ctrl+Shift+H
                </span>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close HUD"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Metric Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {/* ── 1. Storage Usage ── */}
              <MetricPanel icon={<HardDrive size={14} />} label="Storage Usage">
                <MetricRow
                  label="Used / Quota"
                  value={`${formatKB(metrics.totalStorageKB)} / ${formatKB(metrics.quotaKB)}`}
                  colorClass={statusColor(metrics.storagePercent)}
                />
                <BarIndicator percent={metrics.storagePercent} />
                <div className="mt-3 space-y-1.5 pt-2 border-t border-white/5">
                  {metrics.keyBreakdown.map(k => (
                    <MetricRow
                      key={k.key}
                      label={k.key}
                      value={formatKB(k.sizeKB)}
                      colorClass="text-white/50"
                    />
                  ))}
                </div>
              </MetricPanel>

              {/* ── 2. Database Health ── */}
              <MetricPanel icon={<Database size={14} />} label="Database Health">
                <MetricRow
                  label="Total Records"
                  value={metrics.totalRecords.toLocaleString()}
                  colorClass="text-cyan-400"
                />
                <BarIndicator
                  percent={Math.min(100, (metrics.totalRecords / 500) * 100)}
                  color="bg-cyan-400"
                />
                <div className="mt-3 space-y-1.5 pt-2 border-t border-white/5">
                  {Object.entries(metrics.dbCounts).map(([key, count]) => (
                    <MetricRow
                      key={key}
                      label={key}
                      value={count.toLocaleString()}
                      colorClass={count > 0 ? 'text-emerald-400/80' : 'text-white/30'}
                    />
                  ))}
                </div>
              </MetricPanel>

              {/* ── 3. Network Status ── */}
              <MetricPanel icon={metrics.isOnline ? <Wifi size={14} /> : <WifiOff size={14} />} label="Network Status">
                <StatusDot active={metrics.isOnline} label={metrics.isOnline ? 'ONLINE' : 'OFFLINE'} />
                <div className="mt-2">
                  <StatusDot
                    active={metrics.hasSupabase}
                    label={metrics.hasSupabase ? 'SUPABASE LINKED' : 'SUPABASE N/A'}
                  />
                </div>
                <div className="mt-3 pt-2 border-t border-white/5">
                  <MetricRow
                    label="Connection"
                    value={metrics.isOnline ? 'ACTIVE' : 'DROPPED'}
                    colorClass={metrics.isOnline ? 'text-emerald-400' : 'text-red-400'}
                  />
                </div>
              </MetricPanel>

              {/* ── 4. Session Info ── */}
              <MetricPanel icon={<Clock size={14} />} label="Session Info">
                <MetricRow label="App Version" value={`v${metrics.appVersion}`} colorClass="text-violet-400" />
                <MetricRow label="Uptime" value={uptimeStr} colorClass="text-cyan-400" />
                <MetricRow
                  label="Last Backup"
                  value={
                    metrics.lastBackup
                      ? new Date(metrics.lastBackup).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })
                      : 'NEVER'
                  }
                  colorClass={metrics.lastBackup ? 'text-emerald-400' : 'text-amber-400'}
                />
                <div className="mt-3 pt-2 border-t border-white/5">
                  <MetricRow
                    label="XP"
                    value={metrics.xp.toLocaleString()}
                    colorClass="text-amber-400"
                  />
                  <MetricRow
                    label="Level"
                    value={`LVL ${metrics.level}`}
                    colorClass="text-violet-400"
                  />
                </div>
              </MetricPanel>

              {/* ── 5. Performance ── */}
              <MetricPanel icon={<Activity size={14} />} label="Performance">
                {metrics.pageLoadMs !== null && (
                  <MetricRow
                    label="Page Load"
                    value={`${metrics.pageLoadMs.toFixed(0)} ms`}
                    colorClass={metrics.pageLoadMs < 2000 ? 'text-emerald-400' : 'text-amber-400'}
                  />
                )}
                {metrics.heapUsedMB !== null ? (
                  <>
                    <MetricRow
                      label="Heap Used"
                      value={`${metrics.heapUsedMB.toFixed(1)} MB`}
                      colorClass="text-cyan-400"
                    />
                    <MetricRow
                      label="Heap Total"
                      value={`${metrics.heapTotalMB!.toFixed(1)} MB`}
                      colorClass="text-white/50"
                    />
                    <MetricRow
                      label="Heap Limit"
                      value={`${metrics.heapLimitMB!.toFixed(0)} MB`}
                      colorClass="text-white/30"
                    />
                    <BarIndicator
                      percent={(metrics.heapUsedMB / metrics.heapLimitMB!) * 100}
                    />
                  </>
                ) : (
                  <p className="text-[10px] font-mono text-white/30">
                    Heap metrics available in Chrome only
                  </p>
                )}
              </MetricPanel>

              {/* ── 6. System Overview (summary tile) ── */}
              <MetricPanel icon={<Server size={14} />} label="System Overview">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={12} className="text-amber-400" />
                  <span className="text-xs font-mono text-emerald-400">
                    ALL SYSTEMS {metrics.isOnline ? 'NOMINAL' : 'DEGRADED'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <MetricRow
                    label="Storage"
                    value={`${metrics.storagePercent.toFixed(1)}%`}
                    colorClass={statusColor(metrics.storagePercent)}
                  />
                  <MetricRow
                    label="DB Records"
                    value={metrics.totalRecords.toLocaleString()}
                    colorClass="text-cyan-400"
                  />
                  <MetricRow
                    label="Network"
                    value={metrics.isOnline ? 'UP' : 'DOWN'}
                    colorClass={metrics.isOnline ? 'text-emerald-400' : 'text-red-400'}
                  />
                  <MetricRow
                    label="Runtime"
                    value={uptimeStr}
                    colorClass="text-cyan-400"
                  />
                </div>
                <div className="mt-3 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <Shield size={12} className="text-emerald-400/60" />
                    <span className="text-[10px] font-mono text-white/30">
                      REFRESH CYCLE: {REFRESH_INTERVAL_MS / 1000}s • TICK #{tick}
                    </span>
                  </div>
                </div>
              </MetricPanel>
            </div>

            {/* AIL/AIP Platform Observatory */}
            <div className="border-t border-emerald-500/10 p-6 bg-black/50">
              <DevObservatoryPanel />
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-emerald-500/10 text-center">
              <p className="text-[10px] font-mono text-white/20">
                MANI OS DIAGNOSTIC TELEMETRY • PRESS <span className="text-white/40">ESC</span> TO CLOSE
              </p>
            </div>
          </motion.div>

          {/* Inject scanline keyframes */}
          <style>{`
            @keyframes hud-scanline {
              0% { transform: translateY(0); }
              100% { transform: translateY(100%); }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default React.memo(SystemHudOverlay);
