// content.js - Automatic LeetCode problem submission tracker

console.log('Antigravity LeetCode Sync Engine Injected & Listening...');

// Create a MutationObserver to listen for DOM additions on LeetCode submission pages
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if the text content or elements contain 'Accepted' (LeetCode submission success state)
          const text = node.textContent || '';
          if (
            (text.includes('Accepted') && node.classList && (node.classList.contains('text-success') || node.classList.contains('success'))) ||
            node.querySelector('[data-e2e-locator="submission-result-success"]') || 
            (node.tagName === 'SPAN' && text.trim() === 'Accepted' && node.className.includes('green'))
          ) {
            console.log('🎉 LeetCode Problem Solved Status: ACCEPTED! Syncing to Antigravity...');
            
            // Send automatic tracking relay message to background script
            chrome.runtime.sendMessage({ action: 'logLeetCode' }, (response) => {
              if (response && response.success) {
                console.log('✅ Streaks successfully incremented by Antigravity Companion relay!');
              }
            });
            
            // Disconnect observer for 5 seconds to prevent double triggers on the same submission
            observer.disconnect();
            setTimeout(() => {
              observer.observe(document.body, { childList: true, subtree: true });
            }, 5000);
            return;
          }
        }
      }
    }
  }
});

// Start observing the page body
observer.observe(document.body, { childList: true, subtree: true });
