// content.js - Automatic LeetCode Solve Telemetry Scraper
console.log('🛡️ Antigravity Secure LeetCode Scraper Injected & Observing...');

// MutationObserver listens for DOM changes to detect the successful "Accepted" state
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const text = node.textContent || '';
          
          // Identify LeetCode Accepted Submission success triggers
          if (
            (text.includes('Accepted') && node.classList && (node.classList.contains('text-success') || node.classList.contains('success'))) ||
            node.querySelector('[data-e2e-locator="submission-result-success"]') || 
            (node.tagName === 'SPAN' && text.trim() === 'Accepted' && node.className.includes('green'))
          ) {
            console.log('🎉 LeetCode Solved Event Intercepted! Extracting problem telemetry...');
            
            // 1. Extract exact problem slug from current URL
            const urlPath = window.location.pathname;
            const slugMatch = urlPath.match(/\/problems\/([^/]+)/);
            const slug = slugMatch ? slugMatch[1] : 'leetcode-problem';

            // 2. Extract title from document.title (format: "Two Sum - LeetCode")
            let title = document.title.split(' - ')[0] || 'LeetCode Problem';
            if (title.includes('problems') || title === 'LeetCode') {
              // Fallback clean-up of slug
              title = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            }

            // 3. Scrape difficulty from page metadata classes
            let difficulty = 'Medium'; // default fallback
            const easyEl = document.querySelector('.text-success, .text-easy, [class*="easy"]');
            const medEl = document.querySelector('.text-warning, .text-medium, [class*="medium"]');
            const hardEl = document.querySelector('.text-danger, .text-hard, [class*="hard"]');
            
            if (easyEl && easyEl.textContent.toLowerCase().includes('easy')) difficulty = 'Easy';
            else if (hardEl && hardEl.textContent.toLowerCase().includes('hard')) difficulty = 'Hard';
            else if (medEl && medEl.textContent.toLowerCase().includes('medium')) difficulty = 'Medium';

            console.log(`📡 Transmitting Telemetry: "${title}" (${slug}) | Difficulty: ${difficulty}`);

            // Send securely normalized payload to background worker
            chrome.runtime.sendMessage({ 
              action: 'logLeetCodeSolve',
              payload: { title, slug, difficulty }
            }, (response) => {
              if (response && response.success) {
                console.log('✅ Telemetry successfully pushed to background sync queue!');
              }
            });
            
            // Debounce observing to prevent duplicate events from same action
            observer.disconnect();
            setTimeout(() => {
              observer.observe(document.body, { childList: true, subtree: true });
            }, 8000);
            
            return;
          }
        }
      }
    }
  }
});

// Start observing the page body
observer.observe(document.body, { childList: true, subtree: true });
