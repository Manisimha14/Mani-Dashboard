// dashboard-content.js - Content script injected into the Antigravity Dashboard to bridge communication
console.log('🛡️ Antigravity Dashboard Extension Bridge active and listening...');

// 1. Relay messages from the React page to the extension background page
window.addEventListener('antigravity-dashboard-request', (event) => {
  if (event.detail) {
    chrome.runtime.sendMessage(event.detail, (response) => {
      // Send response back to React page
      window.postMessage({ type: 'antigravity-telemetry-data', data: response }, '*');
    });
  }
});

// 2. Relay messages from the extension background page to the React page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  window.postMessage({ type: 'antigravity-extension-message', message }, '*');
  sendResponse({ success: true, relayed: true });
});
