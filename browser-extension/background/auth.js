// background/auth.js - Sandboxed Scoped Token Manager

const AUTH_STORAGE_KEY = 'antigravity_scoped_sync_token';

/**
 * Retrieves the stored connection key securely.
 */
function getScopedSyncToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get([AUTH_STORAGE_KEY], (result) => {
      resolve(result[AUTH_STORAGE_KEY] || null);
    });
  });
}

/**
 * Saves a new connection key securely.
 */
function setScopedSyncToken(token) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [AUTH_STORAGE_KEY]: token }, () => {
      console.log('🛡️ Sandboxed scoped API token securely written to local extension vault.');
      resolve(true);
    });
  });
}

/**
 * Removes the sync token, effectively logging out the device connection.
 */
function revokeStoredToken() {
  return new Promise((resolve) => {
    chrome.storage.local.remove([AUTH_STORAGE_KEY], () => {
      console.log('🔌 Sandboxed companion connection token purged.');
      resolve(true);
    });
  });
}

// Global listener for handshake init event from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'storeScopedToken') {
    const { token } = message;
    if (!token || !token.startsWith('ext_sync_v1_')) {
      console.error('🛡️ Blocked attempt to register malformed or unauthorized sync token.');
      sendResponse({ success: false, reason: 'Invalid token format' });
      return true;
    }

    setScopedSyncToken(token).then(() => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel active
  }
});
