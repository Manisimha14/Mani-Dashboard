// background/queue.js - Durable Local Sync Queue Manager

const OUTBOX_STORAGE_KEY = 'sync_events_outbox';

/**
 * Retrieves all currently queued events from persistent storage.
 */
function getSyncOutbox() {
  return new Promise((resolve) => {
    chrome.storage.local.get([OUTBOX_STORAGE_KEY], (res) => {
      resolve(res[OUTBOX_STORAGE_KEY] || []);
    });
  });
}

/**
 * Saves the modified event queue back to local storage.
 */
function saveSyncOutbox(outbox) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [OUTBOX_STORAGE_KEY]: outbox }, () => {
      resolve(true);
    });
  });
}

/**
 * Enqueues a new telemetry tracking event.
 */
async function enqueueSyncEvent(eventType, payload) {
  const outbox = await getSyncOutbox();
  
  // RFC4122 v4 compliant client UUID generator
  const clientEventId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

  const newEvent = {
    client_event_id: clientEventId,
    source: 'companion_extension',
    event_type: eventType,
    payload: payload,
    occurred_at: new Date().toISOString(),
    retry_count: 0
  };

  outbox.push(newEvent);
  await saveSyncOutbox(outbox);
  console.log(`📥 Telemetry event [${eventType}] queued locally. Event ID: ${clientEventId}`);
  
  // Trigger queue sync processing loop immediately
  triggerQueueProcessing();
}

/**
 * Removes successfully synchronized events from the local outbox.
 */
async function removeQueuedEvent(clientEventId) {
  const outbox = await getSyncOutbox();
  const filtered = outbox.filter(evt => evt.client_event_id !== clientEventId);
  await saveSyncOutbox(filtered);
}

/**
 * Increments the retry counter for a failing event.
 */
async function incrementEventRetry(clientEventId) {
  const outbox = await getSyncOutbox();
  const modified = outbox.map(evt => {
    if (evt.client_event_id === clientEventId) {
      return { ...evt, retry_count: evt.retry_count + 1 };
    }
    return evt;
  });
  await saveSyncOutbox(modified);
}
