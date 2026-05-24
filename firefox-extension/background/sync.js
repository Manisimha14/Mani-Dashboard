// background/sync.js - Durable Direct Supabase Sync Engine

const SUPABASE_URL = 'https://frqrkkphddvxnsouhkfr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZycXJra3BoZGR2eG5zb3Voa2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMTE3OTEsImV4cCI6MjA5NDU4Nzc5MX0.WUFMwYQGhWIqmFNJykcPigazS95PXYXqI8amyesHb6g';

let isProcessingQueue = false;

/**
 * Main queue processing loop. Fetches pending events and dispatches them in sequence.
 */
async function triggerQueueProcessing() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    const token = await getScopedSyncToken();
    if (!token) {
      console.warn('🔌 Sync paused: No scoped companion authorization token registered.');
      isProcessingQueue = false;
      return;
    }

    let outbox = await getSyncOutbox();
    if (outbox.length === 0) {
      isProcessingQueue = false;
      return;
    }

    console.log(`🔄 Direct Sync Process started. Processing ${outbox.length} queued events...`);

    // Process sequentially to preserve chronological ordering
    for (const event of outbox) {
      // Hard cap on retry attempts (e.g. 5 retries max to prevent blocking queue indefinitely)
      if (event.retry_count >= 5) {
        console.error(`❌ Event [${event.client_event_id}] reached max retry limit. Discarding.`);
        await removeQueuedEvent(event.client_event_id);
        continue;
      }

      const success = await dispatchEventToSupabase(event, token);
      if (success) {
        await removeQueuedEvent(event.client_event_id);
        console.log(`✅ Event [${event.client_event_id}] synced successfully.`);
      } else {
        await incrementEventRetry(event.client_event_id);
        // Implement exponential retry backoff delay
        const backoffSeconds = Math.pow(2, event.retry_count) * 2;
        console.warn(`⏳ Sync failed for [${event.client_event_id}]. Retrying in ${backoffSeconds}s...`);
        
        setTimeout(() => {
          isProcessingQueue = false;
          triggerQueueProcessing();
        }, backoffSeconds * 1000);
        
        return; // Break sequence loop and schedule retry
      }
    }
  } catch (err) {
    console.error('⚠️ Sync processing loop error:', err);
  } finally {
    isProcessingQueue = false;
  }
}

/**
 * Dispatches a single event to Supabase submit_sync_event RPC
 */
async function dispatchEventToSupabase(event, token) {
  const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/submit_sync_event`;
  
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        client_event_id: event.client_event_id,
        source: event.source,
        event_type: event.event_type,
        payload: event.payload,
        occurred_at: event.occurred_at,
        ext_token: token
      })
    });

    if (response.status === 401 || response.status === 403) {
      console.error('🛡️ Token authorization error (401/403). Revoking companion token.');
      await revokeStoredToken();
      return false;
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Supabase sync request error ${response.status}: ${errText}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Direct Supabase fetch network failure:', err);
    return false;
  }
}

// Set up periodic online detection alerts
chrome.alarms?.create('sync_poll', { periodInMinutes: 5 });
chrome.alarms?.onAlarm.addListener((alarm) => {
  if (alarm.name === 'sync_poll') {
    triggerQueueProcessing();
  }
});

// Sync immediately when connection transitions to online
if (typeof window !== 'undefined') {
  window.addEventListener('online', triggerQueueProcessing);
}
