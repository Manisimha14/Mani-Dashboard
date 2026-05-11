import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Download, Upload, Trash2, AlertTriangle, ShieldCheck, FileJson } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useSoundFX } from '../hooks/useSoundFX';

export default function BackupManager() {
  const { exportData, importData, resetData } = useAppStore();
  const { play } = useSoundFX();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    play('click');
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `productivity-vault-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (window.confirm('Importing data will overwrite your current progress. Continue?')) {
          importData(json);
          play('achievement');
          alert('Data successfully synced to local vault.');
        }
      } catch (err) {
        alert('Invalid backup file. Encryption mismatch.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    play('click');
    if (window.confirm('CRITICAL: This will permanently purge your local productivity vault. This cannot be undone. Proceed?')) {
      resetData();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-6 flex flex-col gap-4 border-emerald-500/10 hover:border-emerald-500/20 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck size={20} />
            </div>
            <h4 className="font-bold text-white">Vault Security</h4>
          </div>
          <p className="text-xs text-white/50 leading-relaxed">
            Your data is stored locally in your browser. Create periodic backups to ensure your streaks and achievements are never lost.
          </p>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleExport}
              className="flex-1 btn-glow py-2 flex items-center justify-center gap-2 text-xs"
            >
              <Download size={14} />
              Export Backup
            </button>
            <button
              onClick={() => { play('click'); fileInputRef.current?.click(); }}
              className="flex-1 btn-ghost py-2 flex items-center justify-center gap-2 text-xs"
            >
              <Upload size={14} />
              Import Data
            </button>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            className="hidden"
            accept=".json"
          />
        </div>

        <div className="glass-card p-6 flex flex-col gap-4 border-red-500/10 hover:border-red-500/20 transition-colors">
          <div className="flex items-center gap-3 text-red-400">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle size={20} />
            </div>
            <h4 className="font-bold text-white">Danger Zone</h4>
          </div>
          <p className="text-xs text-white/50 leading-relaxed">
            Resetting the vault will clear all streaks, problems solved, and reading progress. All achievements will be locked.
          </p>
          <button
            onClick={handleReset}
            className="w-full py-2 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 text-xs font-bold transition-all mt-auto"
          >
            <Trash2 size={14} className="inline mr-2" />
            Purge Local Vault
          </button>
        </div>
      </div>
    </div>
  );
}
