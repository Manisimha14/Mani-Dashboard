import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, Upload, Trash2, AlertTriangle, ShieldCheck, 
  FileJson, Database, RefreshCw, Clock, History, Sparkles, CheckCircle, ArrowRight,
  X, ChevronRight, AlertCircle, BookOpen, TreePine, Target, Bell, LayoutGrid,
  Activity
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useSoundFX } from '../hooks/useSoundFX';
import { encryptVaultData } from '../utils/vaultCrypto';
import { runImportPipeline } from '../services/ail/importPipeline.service';
import type { ImportPipelineResult, ImportStage, DiagnosticStatus } from '../services/ail/importPipeline.service';
import toast from 'react-hot-toast';

interface BackupSnapshot {
  id: string;
  name: string;
  timestamp: string;
  xp: number;
  level: number;
  sizeBytes: number;
  payload: string;
}

// ─── Integrity Ring (Apple-Watch style, adapted from Reports.tsx ConsistencyRing) ─
const IntegrityRing = React.memo(({ score, size = 52 }: { score: number; size?: number }) => {
  const radius = size / 2;
  const stroke = 3.5;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const color = score >= 90 ? '#34d399' : score >= 70 ? '#fbbf24' : '#f87171';
  const glowColor = score >= 90 ? 'rgba(52,211,153,0.15)' : score >= 70 ? 'rgba(251,191,36,0.15)' : 'rgba(248,113,113,0.15)';

  return (
    <div className="relative flex items-center justify-center shrink-0">
      <svg
        height={size}
        width={size}
        className="transform -rotate-90"
        style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
      >
        <circle
          stroke="rgba(255,255,255,0.03)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <span className="absolute text-[10px] font-black text-white/90">{score}%</span>
    </div>
  );
});

IntegrityRing.displayName = 'IntegrityRing';

// ─── Stage Status Indicator ─────────────────────────────────────────────────────
const StageIndicator = React.memo(({ status }: { status: DiagnosticStatus }) => {
  const config = {
    pass: { color: 'bg-emerald-400', shadow: 'shadow-emerald-400/30' },
    warn: { color: 'bg-amber-400', shadow: 'shadow-amber-400/30' },
    fail: { color: 'bg-red-400', shadow: 'shadow-red-400/30' },
  };
  const { color, shadow } = config[status];
  return <span className={`w-2 h-2 rounded-full ${color} ${shadow} shadow-[0_0_6px] shrink-0`} />;
});

StageIndicator.displayName = 'StageIndicator';

// ─── Stage Label Map ────────────────────────────────────────────────────────────
const STAGE_LABELS: Record<ImportStage, string> = {
  decrypt: 'Decrypt & Parse',
  schema_validate: 'Schema Validation',
  integrity_scan: 'Integrity Scan',
  conflict_detect: 'Conflict Detection',
  ready: 'Ready',
  error: 'Error',
};

// ─── Import Preview Panel ───────────────────────────────────────────────────────
const ImportPreviewPanel = React.memo(({
  preview,
  onConfirm,
  onCancel,
}: {
  preview: ImportPipelineResult;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const { summary, diagnostics, warnings, integrityScore, success } = preview;

  // Group diagnostics by stage, showing the worst status for each stage
  const stageOrder: ImportStage[] = ['decrypt', 'schema_validate', 'integrity_scan', 'conflict_detect', 'ready'];
  const stageStatuses = stageOrder.map(stage => {
    const stageDiags = diagnostics.filter(d => d.stage === stage);
    if (stageDiags.length === 0) return null;
    // Pick worst status
    const worstStatus: DiagnosticStatus = stageDiags.some(d => d.status === 'fail')
      ? 'fail'
      : stageDiags.some(d => d.status === 'warn')
        ? 'warn'
        : 'pass';
    return { stage, status: worstStatus, diagnostics: stageDiags };
  }).filter(Boolean) as { stage: ImportStage; status: DiagnosticStatus; diagnostics: typeof diagnostics }[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="glass-card p-6 border-violet-500/15 bg-gradient-to-br from-violet-950/10 via-[#0e0f17]/95 to-[#0e0f17]/98 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/5 blur-3xl rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
            <Activity size={18} className="drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
          </div>
          <div>
            <h4 className="font-black text-white text-sm uppercase tracking-wider flex items-center gap-2">
              Import Pipeline Preview
              {success ? (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                  Ready
                </span>
              ) : (
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wider">
                  Failed
                </span>
              )}
            </h4>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              {diagnostics.length} checks · {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <IntegrityRing score={integrityScore} />
      </div>

      {/* Pipeline Stages */}
      <div className="space-y-2 mb-5">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Pipeline Stages</span>
        <div className="space-y-1.5">
          {stageStatuses.map(({ stage, status, diagnostics: stageDiags }) => (
            <div
              key={stage}
              className="flex items-start gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5"
            >
              <StageIndicator status={status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black text-white uppercase tracking-wide">
                    {STAGE_LABELS[stage]}
                  </span>
                </div>
                {stageDiags.map((d, idx) => (
                  <p key={idx} className="text-[10px] text-white/40 font-medium leading-relaxed mt-0.5 break-words">
                    {d.message}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Record Counts */}
      <div className="mb-5">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 block mb-2">Record Summary</span>
        <div className="flex flex-wrap gap-2">
          {[
            { icon: '📚', label: 'Problems', count: summary.problems },
            { icon: '🌳', label: 'Sessions', count: summary.focusSessions },
            { icon: '📖', label: 'Chapters', count: summary.chapters },
            { icon: '🏆', label: 'Achievements', count: summary.achievements },
            { icon: '📊', label: 'Trackers', count: summary.trackers },
            { icon: '🔔', label: 'Reminders', count: summary.reminders },
            { icon: '📅', label: 'Activity', count: summary.dailyActivity },
          ].map(({ icon, label, count }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/5 text-[10px] font-bold text-white/60"
            >
              <span>{icon}</span>
              <span className="text-white font-black">{count}</span>
              <span className="text-white/30">{label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Warnings */}
      <AnimatePresence>
        {warnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400/60 block mb-2">
              ⚠️ Warnings ({warnings.length})
            </span>
            <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-thin">
              {warnings.map((w, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/[0.03] border border-amber-500/10">
                  <AlertCircle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-[10px] text-amber-300/70 font-medium leading-relaxed break-words">{w}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] text-white/60 hover:text-white hover:bg-white/5 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
        >
          <X size={12} />
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={!success}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            success
              ? 'bg-violet-600 hover:bg-violet-500 text-white btn-glow'
              : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
          }`}
        >
          <CheckCircle size={12} />
          Confirm Import
        </button>
      </div>
    </motion.div>
  );
});

ImportPreviewPanel.displayName = 'ImportPreviewPanel';

// ─── Main BackupManager Component ───────────────────────────────────────────────

export default function BackupManager() {
  const { 
    exportData, 
    importData, 
    resetData, 
    lastBackupAt, 
    recordBackup,
    xp,
    level 
  } = useAppStore();
  const { play } = useSoundFX();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPipelineResult | null>(null);
  const [rawImportPayload, setRawImportPayload] = useState<string>('');

  // Load snapshots from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('backupSnapshots');
      if (stored) {
        setSnapshots(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse backup snapshots', e);
    }
  }, []);

  const getRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Never';
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Never';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = 1;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Add snapshot to the rolling ledger
  const addSnapshotToLedger = (encryptedPayload: string) => {
    const newSnapshot: BackupSnapshot = {
      id: `snap-${Date.now()}`,
      name: `Vault Snapshot #${snapshots.length + 1}`,
      timestamp: new Date().toISOString(),
      xp,
      level,
      sizeBytes: new Blob([encryptedPayload]).size,
      payload: encryptedPayload
    };

    const updated = [newSnapshot, ...snapshots].slice(0, 5);
    setSnapshots(updated);
    localStorage.setItem('backupSnapshots', JSON.stringify(updated));
  };

  const handleExport = () => {
    play('click');
    try {
      const data = exportData();
      const encrypted = encryptVaultData(data);
      
      // Save to rolling ledger
      addSnapshotToLedger(encrypted);

      // Trigger browser download
      const blob = new Blob([encrypted], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mani-vault-${new Date().toISOString().split('T')[0]}.mvsf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      recordBackup();
      play('success');
      toast.success('Secure Crypt-Vault Backup generated & recorded! 🛡️');
    } catch (err) {
      toast.error('Failed to serialize backup.');
    }
  };

  /** Run the import pipeline and show preview instead of importing directly */
  const runPipelinePreview = (rawText: string) => {
    try {
      const result = runImportPipeline(rawText, { xp, level });
      setRawImportPayload(rawText);
      setImportPreview(result);

      if (!result.success) {
        play('error');
        toast.error('Import validation failed — review diagnostics below.');
      } else {
        play('click');
        toast.success('Import validated — review preview and confirm.');
      }
    } catch (err: unknown) {
      play('error');
      const message = err instanceof Error ? err.message : 'Pipeline execution failed';
      toast.error(message);
    }
  };

  /** Confirm import after pipeline preview */
  const handleConfirmImport = () => {
    if (!importPreview?.success || !importPreview.data) return;

    try {
      importData(importPreview.data);
      recordBackup();
      play('success');
      toast.success('Data successfully restored from Secure Crypt-Vault!');

      // Also save to ledger if not already present
      const alreadyExists = snapshots.some(s => s.payload === rawImportPayload);
      if (!alreadyExists && rawImportPayload) {
        addSnapshotToLedger(rawImportPayload);
      }

      setImportPreview(null);
      setRawImportPayload('');

      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: unknown) {
      play('error');
      const message = err instanceof Error ? err.message : 'Signature mismatch or corrupted vault.';
      toast.error(message);
    }
  };

  /** Cancel import preview */
  const handleCancelImport = () => {
    play('click');
    setImportPreview(null);
    setRawImportPayload('');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      runPipelinePreview(text);
    };
    reader.readAsText(file);

    // Reset file input so re-selecting the same file triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRestoreFromSnapshot = (snapshot: BackupSnapshot) => {
    play('click');
    runPipelinePreview(snapshot.payload);
  };

  const handleDeleteSnapshot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    play('click');
    const updated = snapshots.filter(s => s.id !== id);
    setSnapshots(updated);
    localStorage.setItem('backupSnapshots', JSON.stringify(updated));
    toast.success('Snapshot purged from local ledger.');
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    play('click');
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      runPipelinePreview(text);
    };
    reader.readAsText(file);
  };

  const lastBackupMs = lastBackupAt ? new Date(lastBackupAt).getTime() : 0;
  const isOverdue = !lastBackupAt || (Date.now() - lastBackupMs) > 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-6">
      {isOverdue && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 border-amber-500/20 bg-gradient-to-r from-amber-950/20 via-[#0e0f17]/95 to-[#0e0f17]/98 shadow-[0_4px_20px_rgba(245,158,11,0.05)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5 sm:mt-0 animate-pulse">
              <AlertTriangle size={18} className="drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            </div>
            <div className="flex flex-col">
              <h5 className="text-xs font-black text-amber-400 uppercase tracking-wider">
                Crypt-Vault Backup Overdue 🛡️
              </h5>
              <p className="text-[11px] text-white/55 font-medium leading-relaxed mt-0.5">
                Your local-first state has not been backed up in the last 7 days. Create a secure snapshot to protect your levels, achievements, and streaks!
              </p>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 hover:text-white text-[10px] font-black uppercase tracking-wider whitespace-nowrap self-start sm:self-auto transition-all"
          >
            Backup Now
          </button>
        </motion.div>
      )}

      {/* Top action cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Core Backup controls */}
        <div className="glass-card p-6 flex flex-col gap-4 border-violet-500/10 hover:border-violet-500/20 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 blur-2xl rounded-full group-hover:bg-violet-500/10 transition-colors pointer-events-none" />
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 text-violet-400">
              <ShieldCheck size={20} className="drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
            </div>
            <div className="flex flex-col">
              <h4 className="font-black text-white leading-tight uppercase tracking-wider text-sm flex items-center gap-1.5">
                Vault Security <span>🛡️</span>
              </h4>
              <span className="text-[10px] font-bold text-violet-400/80 uppercase tracking-widest mt-0.5">
                Last Crypt-Sync: {getRelativeTime(lastBackupAt)}
              </span>
            </div>
          </div>
          <p className="text-xs text-white/50 leading-relaxed font-medium">
            Mani OS runs fully local-first. Export a Base64-obfuscated <code className="text-violet-400 font-mono">.mvsf</code> cryptographic signature backup file to prevent data loss.
          </p>
          <div className="flex gap-3 pt-2 mt-auto">
            <button
              onClick={handleExport}
              className="flex-1 btn-glow py-2.5 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-all"
            >
              <Download size={14} />
              Export Secure Vault
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="glass-card p-6 flex flex-col gap-4 border-red-500/10 hover:border-red-500/20 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-2xl rounded-full group-hover:bg-red-500/10 transition-colors pointer-events-none" />
          
          <div className="flex items-center gap-3 text-red-400">
            <div className="p-2.5 rounded-xl bg-red-500/10">
              <AlertTriangle size={20} className="drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            </div>
            <h4 className="font-black text-white leading-tight uppercase tracking-wider text-sm">Danger Zone</h4>
          </div>
          <p className="text-xs text-white/50 leading-relaxed font-medium">
            Resetting the local database permanently purges all levels, XP transactions, coding challenges, book history, and streaks. This is irreversible.
          </p>
          <button
            onClick={resetData}
            className="w-full py-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 text-xs font-black uppercase tracking-wider transition-all mt-auto"
          >
            <Trash2 size={14} className="inline mr-2" />
            Purge Local Vault
          </button>
        </div>
      </div>

      {/* Import Preview Panel (shown when pipeline has been run) */}
      <AnimatePresence>
        {importPreview && (
          <ImportPreviewPanel
            preview={importPreview}
            onConfirm={handleConfirmImport}
            onCancel={handleCancelImport}
          />
        )}
      </AnimatePresence>

      {/* Drag & Drop Import Card */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => { play('click'); fileInputRef.current?.click(); }}
        className={`glass-card p-8 border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
          isDragging 
            ? 'border-violet-500 bg-violet-950/20 scale-[0.99] shadow-[0_0_20px_rgba(139,92,246,0.15)]' 
            : 'border-white/10 hover:border-violet-500/40 hover:bg-white/[0.01]'
        }`}
      >
        <div className={`p-4 rounded-full bg-white/5 mb-3 transition-transform duration-300 ${isDragging ? 'scale-110 bg-violet-500/10 text-violet-400' : 'text-white/60 group-hover:text-white'}`}>
          <Upload size={24} className={isDragging ? 'animate-bounce' : ''} />
        </div>
        <h5 className="font-black text-sm text-white uppercase tracking-wider">Drag & Drop Secure Vault File</h5>
        <p className="text-xs text-white/40 mt-1 max-w-sm">
          Drop your encrypted <code className="text-violet-400/80 font-mono">.mvsf</code> backup file here, or click to browse files.
        </p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportFile}
          className="hidden"
          accept=".mvsf,.json"
        />
      </div>

      {/* Cryptic Ledger / Rolling Snapshots list */}
      <div className="glass-card p-6 border-white/5 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History size={16} className="text-violet-400" />
            <h4 className="font-black text-white leading-tight uppercase tracking-wider text-xs">
              Cryptic Ledger: Snapshot Vault
            </h4>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
            {snapshots.length} / 5 snapshots
          </span>
        </div>

        <p className="text-xs text-white/40 mb-4 leading-relaxed font-medium">
          Your 5 most recent manual backups are preserved directly inside your browser storage under secure sandboxing. Restoring maps state structures instantly.
        </p>

        <div className="space-y-3">
          <AnimatePresence>
            {snapshots.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-8 border border-white/5 bg-white/[0.01] rounded-xl text-white/30"
              >
                <Database size={24} className="mb-2 opacity-50" />
                <span className="text-xs font-bold uppercase tracking-widest">No local snapshots generated</span>
              </motion.div>
            ) : (
              snapshots.map((snap) => (
                <motion.div
                  key={snap.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-white/5 bg-[#0f101c]/45 hover:border-violet-500/20 hover:bg-violet-950/[0.05] transition-all duration-300 gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-violet-500/5 text-violet-400 border border-violet-500/10 mt-0.5">
                      <FileJson size={16} />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white tracking-wide uppercase">
                          {snap.name}
                        </span>
                        <div className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                          <Sparkles size={8} />
                          <span>Lvl {snap.level}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {getRelativeTime(snap.timestamp)}
                        </span>
                        <span>•</span>
                        <span>Size: {formatBytes(snap.sizeBytes)}</span>
                        <span>•</span>
                        <span className="text-violet-400/80 font-black">{snap.xp.toLocaleString()} XP</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:ml-auto">
                    <button
                      onClick={() => handleRestoreFromSnapshot(snap)}
                      className="btn-ghost px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-violet-400 border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/20 hover:text-white rounded-lg transition-all"
                    >
                      <RefreshCw size={10} className="group-hover:rotate-180 transition-transform duration-500" />
                      Restore
                    </button>
                    <button
                      onClick={(e) => handleDeleteSnapshot(snap.id, e)}
                      className="p-2 text-white/20 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                      title="Purge Snapshot"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
