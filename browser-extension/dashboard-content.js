// dashboard-content.js - Sandboxed Companion Same-Origin Handshake Bridge
console.log('🛡️ Antigravity Secure Handshake Bridge listening for initialization events...');

window.addEventListener('antigravity-extension-init', (event) => {
  // Extract custom event token payload safely
  const token = event.detail?.token;
  
  if (token && token.startsWith('ext_sync_v1_')) {
    chrome.runtime.sendMessage({ action: 'storeScopedToken', token }, (response) => {
      if (response && response.success) {
        console.log('✅ Sandbox companion token securely registered inside service worker context.');
      }
    });
  }
});

