import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function useExtensionSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // 1. Same-Origin Scoped Token Handshake listener
    const handleHandshakeInit = (event: Event) => {
      const customEvent = event as CustomEvent;
      const token = customEvent.detail?.token;
      if (!token) return;

      // Relay to the background script using the custom extension bridge channel if active
      if (typeof window !== 'undefined' && 'chrome' in window && (window as any).chrome?.runtime?.sendMessage) {
        (window as any).chrome.runtime.sendMessage(
          { action: 'storeScopedToken', token },
          (response: any) => {
            if (response?.success) {
              console.log('✅ Scoped connection token securely stored in background context.');
            }
          }
        );
      }
    };

    window.addEventListener('antigravity-extension-init', handleHandshakeInit);

    // 2. Secure Real-time Event Ledger Observer (Passive UI Consumer)
    const channel = supabase
      .channel(`realtime:sync_events:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_events',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          if (!newRow) return;

          const { event_type, processing_status, error_message } = newRow;

          if (processing_status === 'processed') {
            if (event_type === 'focus_session_completed') {
              toast.success('🌳 Deep work session synced securely from Companion!', { id: 'sync-focus-toast' });
            } else if (event_type === 'leetcode_problem_solved') {
              toast.success('💻 LeetCode solve auto-synced securely from Companion!', { id: 'sync-leetcode-toast' });
            }
          } else if (processing_status === 'failed') {
            toast.error(`🛡️ Telemetry blocked: ${error_message || 'Business logic validation failed.'}`, { id: 'sync-failed-toast' });
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('antigravity-extension-init', handleHandshakeInit);
      supabase.removeChannel(channel);
    };
  }, [user]);
}

