// background.js - Companion Service Worker Wrapper

// Import modular subcomponents securely
importScripts('auth.js', 'queue.js', 'sync.js', 'events.js');

let timerSeconds = 1500; // 25 mins
let timerRunning = false;
let timerInterval = null;

// Time-on-site analytics variables
let activeTabId = null;
let activeDomain = '';

// Initial installation parameters
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get([
    'distractionBlocklist', 'blockerActive', 'blockedAttemptsCount'
  ], (res) => {
    chrome.storage.local.set({
      timerSeconds: 1500,
      timerRunning: false,
      blockerActive: res.blockerActive ?? true,
      distractionBlocklist: res.distractionBlocklist ?? [
        'youtube.com', 'twitter.com', 'x.com', 'reddit.com', 
        'facebook.com', 'instagram.com', 'tiktok.com', 'netflix.com'
      ],
      blockedAttemptsCount: res.blockedAttemptsCount ?? 0
    });
  });
  console.log('🛡️ Antigravity Sandbox Companion background worker successfully initialized.');
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

function updateActiveTabTime() {
  if (!activeTabId) return;
  chrome.tabs.get(activeTabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url) return;
    try {
      const url = new URL(tab.url);
      activeDomain = url.hostname.toLowerCase();
      checkDistractionBlocker();
    } catch (e) {
      // Ignored for non-standard chrome:// or extension pages
    }
  });
}

// Listener for popup and control commands
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleTimer') {
    if (timerRunning) {
      timerRunning = false;
      clearInterval(timerInterval);
      chrome.storage.local.set({ timerRunning: false, timerSeconds });
      sendResponse({ running: false });
    } else {
      timerRunning = true;
      chrome.storage.local.set({ timerRunning: true });
      timerInterval = setInterval(() => {
        if (timerSeconds > 0) {
          timerSeconds--;
          chrome.storage.local.set({ timerSeconds });
          chrome.runtime.sendMessage({ action: 'timerTick', secondsLeft: timerSeconds });
          checkDistractionBlocker();
        } else {
          // Pomodoro Block completed!
          timerRunning = false;
          clearInterval(timerInterval);
          timerSeconds = 1500;
          
          chrome.storage.local.set({ timerRunning: false, timerSeconds: 1500 });
          chrome.runtime.sendMessage({ action: 'timerComplete' });
          
          // Native Rich Chrome Desktop Notification
          chrome.notifications.create('focus-complete', {
            type: 'basic',
            iconUrl: 'icon.png',
            title: '🌳 Focus Block Complete!',
            message: 'Your Pomodoro is done! Synchronizing session securely to your life ledger...',
            priority: 2
          });

          // Enqueue focus completion event directly in outbox
          enqueueSyncEvent('focus_session_completed', {
            duration: 25,
            taskName: 'Focus Block via Companion',
            growthTheme: 'tree',
            ambience: 'none'
          });
        }
      }, 1000);
      sendResponse({ running: true });
    }
    return true; // Keep message channel open
  }

  if (message.action === 'blocklistUpdated') {
    checkDistractionBlocker();
    sendResponse({ success: true });
  }

  if (message.action === 'updateBlocker') {
    chrome.storage.local.set({ blockerActive: message.active });
    sendResponse({ success: true });
  }

  if (message.action === 'logLeetCode') {
    const mockProblem = {
      title: 'Manual Solve via Companion',
      slug: 'manual-solve-via-companion-' + Math.random().toString(36).substring(2, 7),
      difficulty: ['Easy', 'Medium', 'Hard'][Math.floor(Math.random() * 3)],
      timeSpent: 25
    };
    
    enqueueSyncEvent('leetcode_problem_solved', mockProblem)
      .then(() => {
        chrome.storage.local.get(['codingStreak'], (res) => {
          const currentStreak = res.codingStreak ?? 8;
          const newStreak = currentStreak + 1;
          chrome.storage.local.set({ codingStreak: newStreak }, () => {
            sendResponse({ success: true, newStreak });
          });
        });
      })
      .catch((err) => {
        console.error('Failed to log manual LeetCode solve:', err);
        sendResponse({ success: false });
      });
    return true;
  }

  if (message.action === 'syncTelemetry') {
    triggerQueueProcessing()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((err) => {
        console.error('Failed to trigger manual sync:', err);
        sendResponse({ success: false });
      });
    return true;
  }
});

// Distraction Interceptor Shield
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
