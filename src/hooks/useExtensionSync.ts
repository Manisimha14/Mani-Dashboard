import { useEffect } from 'react';
import { useAddFocusSession } from './useFocusQuery';
import { useAddProblem } from './useLeetCodeQuery';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export function useExtensionSync() {
  const { user } = useAuth();
  const { mutate: addFocusSession } = useAddFocusSession();
  const { mutate: addProblem } = useAddProblem();

  useEffect(() => {
    if (import.meta.env.PROD) {
      console.warn('Extension sync is disabled in production until a trusted transport is implemented.');
      return;
    }

    // 1. Listen for messages from the content script
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || event.data.type !== 'antigravity-extension-message') return;

      const { message } = event.data;
      console.log('📬 Extension sync received:', message);

      if (message.action === 'syncEvent') {
        const { type, payload } = message.payload;
        if (type === 'focus') {
          // Add focus session
          const duration = payload.duration || 25;
          const score = Math.min(100, Math.round((duration / 25) * 80 + 10));
          const session = {
            date: new Date().toISOString().split('T')[0],
            startTime: new Date(Date.now() - duration * 60000).toISOString(),
            endTime: new Date().toISOString(),
            duration: duration,
            actualDuration: duration,
            completed: true,
            failed: false,
            taskName: 'Focus Block via Companion',
            growthTheme: 'tree' as const,
            ambience: 'none' as const,
            mode: 'focus' as const,
            productivityScore: score,
          };
          addFocusSession(session);
          toast.success('🌳 Focus block synced from companion extension!', { id: 'focus-sync-toast' });
        } else if (type === 'leetcode') {
          // Add LeetCode problem
          const problem = {
            date: new Date().toISOString().split('T')[0],
            name: 'LeetCode Problem via Companion',
            link: 'https://leetcode.com',
            difficulty: 'Medium' as const,
            topic: 'General Solve',
            status: 'solved' as const,
            completed: true,
            timeSpent: 25,
          };
          addProblem(problem);
          toast.success('💻 LeetCode solve synced from companion extension!', { id: 'leetcode-sync-toast' });
        }
      } else if (message.action === 'syncBatch') {
        const { batch } = message;
        if (Array.isArray(batch)) {
          batch.forEach((evt: any) => {
            const { type, payload } = evt;
            if (type === 'focus') {
              const duration = payload.duration || 25;
              const score = Math.min(100, Math.round((duration / 25) * 80 + 10));
              addFocusSession({
                date: new Date(evt.time || Date.now()).toISOString().split('T')[0],
                startTime: new Date((evt.time || Date.now()) - duration * 60000).toISOString(),
                endTime: new Date(evt.time || Date.now()).toISOString(),
                duration: duration,
                actualDuration: duration,
                completed: true,
                failed: false,
                taskName: 'Focus Block via Companion',
                growthTheme: 'tree' as const,
                ambience: 'none' as const,
                mode: 'focus' as const,
                productivityScore: score,
              });
            } else if (type === 'leetcode') {
              addProblem({
                date: new Date(evt.time || Date.now()).toISOString().split('T')[0],
                name: 'LeetCode Problem via Companion',
                link: 'https://leetcode.com',
                difficulty: 'Medium' as const,
                topic: 'General Solve',
                status: 'solved' as const,
                completed: true,
                timeSpent: 25,
              });
            }
          });
          toast.success(`🔄 Synced ${batch.length} buffered telemetry logs from companion extension!`, { id: 'batch-sync-toast' });
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // 2. Request initial telemetry/streak sync from extension on mount
    const triggerPullSync = () => {
      window.dispatchEvent(new CustomEvent('antigravity-dashboard-request', {
        detail: { action: 'getTelemetry' }
      }));
    };

    // Small delay to ensure extension is fully loaded and content script is injected
    const timer = setTimeout(triggerPullSync, 1200);

    // Also listen for pulled telemetry data to keep strengths/streaks in sync
    const handleTelemetryPull = (event: MessageEvent) => {
      if (event.data && event.data.type === 'antigravity-telemetry-data') {
        const { data } = event.data;
        console.log('📊 Pulled telemetry data from extension:', data);
        if (data) {
          console.log('🔌 Antigravity extension companion connection established.');
          
          const store = useAppStore.getState();
          let needsUpdate = false;
          const updates: any = {};
          
          if (typeof data.focusStreak === 'number' && data.focusStreak > store.focusStreak.currentStreak) {
            updates.focusStreak = {
              ...store.focusStreak,
              currentStreak: data.focusStreak,
              longestStreak: Math.max(data.focusStreak, store.focusStreak.longestStreak),
            };
            needsUpdate = true;
          }
          
          if (typeof data.codingStreak === 'number' && data.codingStreak > store.codingStreak.currentStreak) {
            updates.codingStreak = {
              ...store.codingStreak,
              currentStreak: data.codingStreak,
              longestStreak: Math.max(data.codingStreak, store.codingStreak.longestStreak),
            };
            needsUpdate = true;
          }
          
          if (typeof data.readingStreak === 'number' && data.readingStreak > store.readingStreak.currentStreak) {
            updates.readingStreak = {
              ...store.readingStreak,
              currentStreak: data.readingStreak,
              longestStreak: Math.max(data.readingStreak, store.readingStreak.longestStreak),
            };
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            useAppStore.setState(updates);
            console.log('✨ Synced streaks from extension telemetry:', updates);
          }
        }
      }
    };

    window.addEventListener('message', handleTelemetryPull);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('message', handleTelemetryPull);
      clearTimeout(timer);
    };
  }, [addFocusSession, addProblem]);
}
