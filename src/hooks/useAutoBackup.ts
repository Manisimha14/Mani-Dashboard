import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { encryptVaultData } from '../utils/vaultCrypto';
import toast from 'react-hot-toast';

export function useAutoBackup() {
  const { exportData, recordBackup, userSettings, lastBackupAt } = useAppStore();

  useEffect(() => {
    // Check if auto-backup is enabled
    if (!userSettings.autoBackupEnabled) return;

    const intervalHours = userSettings.autoBackupFrequencyHours || 24;
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    const lastBackupMs = lastBackupAt ? new Date(lastBackupAt).getTime() : 0;
    const timeSinceLastBackup = Date.now() - lastBackupMs;

    // Trigger backup if overdue
    if (timeSinceLastBackup > intervalMs) {
      try {
        const data = exportData();
        const encrypted = encryptVaultData(data);
        
        // Save to rolling ledger (auto-backup slot)
        const stored = localStorage.getItem('backupSnapshots');
        const snapshots = stored ? JSON.parse(stored) : [];
        
        const newSnapshot = {
          id: `auto-snap-${Date.now()}`,
          name: `Auto-Backup (${intervalHours}h Interval)`,
          timestamp: new Date().toISOString(),
          xp: useAppStore.getState().xp,
          level: useAppStore.getState().level,
          sizeBytes: new Blob([encrypted]).size,
          payload: encrypted
        };

        const updated = [newSnapshot, ...snapshots].slice(0, 5); // Keep last 5 snapshots
        localStorage.setItem('backupSnapshots', JSON.stringify(updated));
        
        recordBackup();
        console.log(`[AutoBackup] Successfully generated automatic secure vault snapshot.`);
      } catch (e) {
        console.error('Failed to generate auto-backup', e);
      }
    }

    // Set up polling interval to check while the app is open
    const timer = setInterval(() => {
      const msSinceLast = lastBackupAt ? Date.now() - new Date(useAppStore.getState().lastBackupAt || 0).getTime() : Date.now();
      if (msSinceLast > intervalMs) {
        try {
          const data = exportData();
          const encrypted = encryptVaultData(data);
          
          const stored = localStorage.getItem('backupSnapshots');
          const snapshots = stored ? JSON.parse(stored) : [];
          
          const newSnapshot = {
            id: `auto-snap-${Date.now()}`,
            name: `Auto-Backup (${intervalHours}h Interval)`,
            timestamp: new Date().toISOString(),
            xp: useAppStore.getState().xp,
            level: useAppStore.getState().level,
            sizeBytes: new Blob([encrypted]).size,
            payload: encrypted
          };

          const updated = [newSnapshot, ...snapshots].slice(0, 5);
          localStorage.setItem('backupSnapshots', JSON.stringify(updated));
          
          recordBackup();
          console.log(`[AutoBackup] Periodic trigger generated secure vault snapshot.`);
        } catch (e) {
          console.error('Failed to generate periodic auto-backup', e);
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(timer);
  }, [userSettings.autoBackupEnabled, userSettings.autoBackupFrequencyHours, lastBackupAt, exportData, recordBackup]);
}
