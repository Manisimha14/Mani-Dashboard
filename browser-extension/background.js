// background.js - Upgraded Premium Companion Service Worker

let timerSeconds = 1500; // 25 mins
let timerRunning = false;
let timerInterval = null;

// Time-on-site analytics variables
let activeTabId = null;
let activeDomain = '';
let activeDomainStartTime = Date.now();

// Initial installation parameters
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get([
    'distractionBlocklist', 'focusStreak', 'codingStreak', 'readingStreak', 
    'timeCoding', 'timeLearning', 'blockedAttemptsCount'
  ], (res) => {
    chrome.storage.local.set({
      focusStreak: res.focusStreak ?? 12,
      codingStreak: res.codingStreak ?? 8,
      readingStreak: res.readingStreak ?? 5,
      timerSeconds: 1500,
      timerRunning: false,
      blockerActive: true,
      distractionBlocklist: res.distractionBlocklist ?? [
        'youtube.com', 'twitter.com', 'x.com', 'reddit.com', 
        'facebook.com', 'instagram.com', 'tiktok.com', 'netflix.com'
      ],
      timeCoding: res.timeCoding ?? 0,
      timeLearning: res.timeLearning ?? 0,
      blockedAttemptsCount: res.blockedAttemptsCount ?? 0,
      syncBuffer: []
    });
  });
  console.log('Antigravity Life OS companion background service worker fully primed.');
});

// Listener for focus & active tab shifts to track Web Time-on-Site
chrome.tabs.onActivated.addListener((activeInfo) => {
  activeTabId = activeInfo.tabId;
  updateActiveTabTime();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === activeTabId && changeInfo.url) {
    updateActiveTabTime();
  }
});

// Periodically increment active domain time every 60 seconds
setInterval(() => {
  if (!activeTabId) return;
  chrome.tabs.get(activeTabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url) return;
    
    const url = new URL(tab.url);
    const domain = url.hostname.toLowerCase();
    
    chrome.storage.local.get(['timeCoding', 'timeLearning'], (res) => {
      const codeMin = res.timeCoding ?? 0;
      const learnMin = res.timeLearning ?? 0;
      
      // Coding related sites
      if (domain.includes('leetcode.com') || domain.includes('github.com') || domain.includes('stackoverflow.com')) {
        chrome.storage.local.set({ timeCoding: codeMin + 1 });
      }
      // Learning/notes related sites
      else if (domain.includes('wikipedia.org') || domain.includes('medium.com') || domain.includes('readme.io') || domain.includes('localhost:5173')) {
        chrome.storage.local.set({ timeLearning: learnMin + 1 });
      }
    });
  });
}, 60000);

function updateActiveTabTime() {
  if (!activeTabId) return;
  chrome.tabs.get(activeTabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url) return;
    try {
      const url = new URL(tab.url);
      activeDomain = url.hostname.toLowerCase();
      activeDomainStartTime = Date.now();
      checkDistractionBlocker();
    } catch (e) {
      // Ignored for non-standard chrome:// or extension pages
    }
  });
}

// Listener for popup & page messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleTimer') {
    if (timerRunning) {
      // Pause
      timerRunning = false;
      clearInterval(timerInterval);
      chrome.storage.local.set({ timerRunning: false, timerSeconds });
      sendResponse({ running: false });
    } else {
      // Start
      timerRunning = true;
      chrome.storage.local.set({ timerRunning: true });
      timerInterval = setInterval(() => {
        if (timerSeconds > 0) {
          timerSeconds--;
          chrome.storage.local.set({ timerSeconds });
          chrome.runtime.sendMessage({ action: 'timerTick', secondsLeft: timerSeconds });
          checkDistractionBlocker();
        } else {
          // Timer finished
          timerRunning = false;
          clearInterval(timerInterval);
          timerSeconds = 1500;
          
          chrome.storage.local.get(['focusStreak'], (res) => {
            const newStreak = (res.focusStreak ?? 12) + 1;
            chrome.storage.local.set({ focusStreak: newStreak, timerRunning: false, timerSeconds: 1500 });
            chrome.runtime.sendMessage({ action: 'timerComplete', newStreak });
            
            // Native Rich Chrome Desktop Notification
            chrome.notifications.create('focus-complete', {
              type: 'basic',
              iconUrl: 'icon.png',
              title: '🌳 Focus Block Complete!',
              message: 'Your Pomodoro is done! A tree has been planted in your Antigravity dashboard.',
              priority: 2
            });

            syncWithLocalDashboard('focus', { duration: 25 });
          });
        }
      }, 1000);
      sendResponse({ running: true });
    }
    return true; // Keep message channel open
  }

  if (message.action === 'getTelemetry') {
    chrome.storage.local.get([
      'focusStreak', 'codingStreak', 'readingStreak', 
      'timeCoding', 'timeLearning', 'blockedAttemptsCount'
    ], (res) => {
      sendResponse(res);
    });
    return true;
  }

  if (message.action === 'logLeetCode') {
    chrome.storage.local.get(['codingStreak'], (res) => {
      const newStreak = (res.codingStreak ?? 8) + 1;
      chrome.storage.local.set({ codingStreak: newStreak });
      syncWithLocalDashboard('leetcode', { solved: 1 });
      
      chrome.notifications.create('leetcode-solved', {
        type: 'basic',
        iconUrl: 'icon.png',
        title: '💻 LeetCode Solved!',
        message: 'Your streak has been updated successfully in your accountability dashboard.',
        priority: 1
      });

      sendResponse({ success: true, newStreak });
    });
    return true;
  }

  if (message.action === 'syncTelemetry') {
    chrome.storage.local.get(['syncBuffer'], (res) => {
      const buffer = res.syncBuffer ?? [];
      if (buffer.length > 0) {
        // Broadcast the entire batch to all open dashboard tabs
        chrome.tabs.query({ url: 'http://localhost:5173/*' }, (tabs) => {
          if (tabs && tabs.length > 0) {
            tabs.forEach(tab => {
              chrome.tabs.sendMessage(tab.id, { action: 'syncBatch', batch: buffer });
            });
            chrome.storage.local.set({ syncBuffer: [] }, () => {
              sendResponse({ success: true, count: buffer.length });
            });
          } else {
            sendResponse({ success: false, reason: 'Dashboard offline / not open' });
          }
        });
      } else {
        sendResponse({ success: true, count: 0 });
      }
    });
    return true;
  }

  if (message.action === 'blocklistUpdated') {
    // Immediate block check on active page when list changes
    checkDistractionBlocker();
    sendResponse({ success: true });
  }

  if (message.action === 'updateBlocker') {
    chrome.storage.local.set({ blockerActive: message.active });
    sendResponse({ success: true });
  }
});

// Distraction Interceptor Blocker
function checkDistractionBlocker() {
  chrome.storage.local.get(['blockerActive', 'timerRunning', 'distractionBlocklist', 'blockedAttemptsCount'], (res) => {
    if (res.blockerActive && res.timerRunning) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0] && tabs[0].url) {
          try {
            const url = new URL(tabs[0].url);
            const domain = url.hostname.toLowerCase();
            const list = res.distractionBlocklist ?? [];
            
            const isDistracted = list.some(site => domain.includes(site));
            if (isDistracted) {
              const currentAttempts = res.blockedAttemptsCount ?? 0;
              chrome.storage.local.set({ blockedAttemptsCount: currentAttempts + 1 });

              // Create notification intercept feedback
              chrome.notifications.create('distraction-blocked', {
                type: 'basic',
                iconUrl: 'icon.png',
                title: '🛡️ Focus Shield Intercepted',
                message: `Stay on track! Intercepted domain: ${domain}`,
                priority: 1
              });

              // Redirect tab to gorgeous warning overlay
              chrome.tabs.update(tabs[0].id, { 
                url: 'chrome-extension://' + chrome.runtime.id + '/blocked.html' 
              });
            }
          } catch (e) {
            // Non-standard formats ignored
          }
        }
      });
    }
  });
}

// Broadcast helper to send messages to any open dashboard tabs
function broadcastToDashboard(action, payload) {
  chrome.tabs.query({ url: 'http://localhost:5173/*' }, (tabs) => {
    if (tabs && tabs.length > 0) {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action, payload });
      });
    }
  });
}

// Sync helper posting to the dashboard API
function syncWithLocalDashboard(type, payload) {
  const syncEvent = { type, payload, timestamp: new Date().toISOString() };
  
  // 1. Broadcast real-time event to open dashboard tabs
  broadcastToDashboard('syncEvent', syncEvent);

  // 2. Also keep a fallback buffer
  chrome.storage.local.get(['syncBuffer'], (res) => {
    const buf = res.syncBuffer ?? [];
    buf.push({ type, payload, time: Date.now() });
    chrome.storage.local.set({ syncBuffer: buf });
  });
}
