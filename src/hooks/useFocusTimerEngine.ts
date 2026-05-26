import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { focusTimerService, requestNotificationPermission } from '../services/focusTimerService';

export function useFocusTimerEngine() {
  const isRunning = useAppStore(s => s.focusTimer.isRunning);
  const endTime = useAppStore(s => s.focusTimer.endTime);

  // 1. Initialize notification permissions on engine mount
  useEffect(() => {
    requestNotificationPermission().catch(err => {
      console.warn("Failed to request focus notification permissions:", err);
    });
  }, []);

  // 2. Start the singleton tick engine when app loads
  useEffect(() => {
    focusTimerService.startEngine();
    return () => {
      // Keep it running globally since Layout is always mounted, but cleanup just in case
      // focusTimerService.stopEngine();
    };
  }, []);

  // 3. Tab Visibility Snap Sync
  // When user returns to tab, instantly recalculate remaining time to prevent visual delays
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning && endTime) {
        const store = useAppStore.getState();
        const now = Date.now();
        const currentRemaining = Math.max(0, Math.round((endTime - now) / 1000));
        
        const pomodoroSettings = store.pomodoroSettings;
        const totalDurationSec = (store.focusTimer.mode === 'focus' ? pomodoroSettings.focusDuration :
                                 store.focusTimer.mode === 'short_break' ? pomodoroSettings.shortBreakDuration :
                                 pomodoroSettings.longBreakDuration) * 60;
        
        const elapsed = totalDurationSec - currentRemaining;
        const growthProgress = totalDurationSec > 0 ? (elapsed / totalDurationSec) * 100 : 0;

        store.setFocusTimerState({
          timeLeft: currentRemaining,
          growthProgress,
        });

        if (now >= endTime) {
          focusTimerService.handleComplete();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRunning, endTime]);
}
