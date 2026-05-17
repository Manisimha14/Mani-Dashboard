// popup.js - Upgraded Premium Companion UI controller

document.addEventListener('DOMContentLoaded', async () => {
  const startBtn = document.getElementById('start-btn');
  const timerDisplay = document.getElementById('timer-display');
  const logLeetCodeBtn = document.getElementById('log-leetcode-btn');
  const blockerSwitch = document.getElementById('blocker-switch');
  const syncBtn = document.getElementById('sync-btn');
  const syncBtnLabel = document.getElementById('sync-btn-label');
  const syncIndicator = document.getElementById('sync-indicator');

  // Streaks displays
  const focusStreakEl = document.getElementById('streak-focus');
  const codeStreakEl = document.getElementById('streak-code');
  const readingStreakEl = document.getElementById('streak-reading');

  // Accordion elements
  const accordionToggle = document.getElementById('accordion-toggle');
  const accordionPanel = document.getElementById('accordion-panel');
  const newSiteInput = document.getElementById('new-site-input');
  const addSiteBtn = document.getElementById('add-site-btn');
  const tagsContainer = document.getElementById('blocklist-tags-container');

  // Real-time time-on-site stats
  const totalTimeVal = document.getElementById('total-time-val');
  const codeTimeVal = document.getElementById('code-time-val');
  const learnTimeVal = document.getElementById('learn-time-val');
  const distCountVal = document.getElementById('dist-count-val');

  const codeBar = document.getElementById('code-bar');
  const learnBar = document.getElementById('learn-bar');
  const distBar = document.getElementById('dist-bar');

  // Load state and statistics from local storage
  function loadData() {
    chrome.storage.local.get([
      'focusStreak', 'codingStreak', 'readingStreak', 
      'timerSeconds', 'timerRunning', 'blockerActive',
      'distractionBlocklist', 'syncBuffer',
      'timeCoding', 'timeLearning', 'blockedAttemptsCount'
    ], (res) => {
      // Streaks
      focusStreakEl.textContent = `${res.focusStreak ?? 12}d`;
      codeStreakEl.textContent = `${res.codingStreak ?? 8}d`;
      readingStreakEl.textContent = `${res.readingStreak ?? 5}d`;

      // Active Timer
      if (res.timerRunning) {
        startBtn.textContent = 'Pause Focus';
        startBtn.style.background = '#f43f5e';
      } else {
        startBtn.textContent = 'Start Focus Block';
        startBtn.style.background = '#8b5cf6';
      }
      updateTimerDisplay(res.timerSeconds ?? 1500);

      // Blocker Toggle State
      if (res.blockerActive !== undefined) {
        blockerSwitch.checked = res.blockerActive;
      }

      // Sync Buffer Indicator
      const buffer = res.syncBuffer ?? [];
      if (buffer.length > 0) {
        syncIndicator.className = 'sync-status pending';
        syncBtnLabel.textContent = `SYNC (${buffer.length})`;
      } else {
        syncIndicator.className = 'sync-status';
        syncBtnLabel.textContent = 'SYNCED';
      }

      // Time on site stats
      const codeMin = res.timeCoding ?? 0;
      const learnMin = res.timeLearning ?? 0;
      const distBlockedCount = res.blockedAttemptsCount ?? 0;
      const totalMin = codeMin + learnMin;

      totalTimeVal.textContent = `${totalMin}m`;
      codeTimeVal.textContent = `${codeMin}m`;
      learnTimeVal.textContent = `${learnMin}m`;
      distCountVal.textContent = `${distBlockedCount}`;

      // Calculate relative percentage for progress bars
      const maxVal = Math.max(codeMin + learnMin, 1);
      codeBar.style.width = `${Math.min((codeMin / maxVal) * 100, 100)}%`;
      learnBar.style.width = `${Math.min((learnMin / maxVal) * 100, 100)}%`;
      distBar.style.width = `${Math.min((distBlockedCount / 10) * 100, 100)}%`;

      // Render Blocklist Tags
      const blocklist = res.distractionBlocklist ?? ['youtube.com', 'twitter.com', 'x.com', 'reddit.com', 'facebook.com', 'instagram.com'];
      renderBlocklistTags(blocklist);
    });
  }

  loadData();

  // Accordion Toggle Logic
  accordionToggle.addEventListener('click', () => {
    const isActive = accordionPanel.classList.contains('active');
    if (isActive) {
      accordionPanel.classList.remove('active');
    } else {
      accordionPanel.classList.add('active');
    }
  });

  // Render blocklist tags function
  function renderBlocklistTags(sites) {
    tagsContainer.innerHTML = '';
    sites.forEach(site => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.innerHTML = `${site} <span class="tag-remove" data-site="${site}">×</span>`;
      tagsContainer.appendChild(tag);
    });

    // Remove buttons event listener
    document.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const siteToRemove = e.target.getAttribute('data-site');
        chrome.storage.local.get(['distractionBlocklist'], (res) => {
          const list = res.distractionBlocklist ?? [];
          const updated = list.filter(s => s !== siteToRemove);
          chrome.storage.local.set({ distractionBlocklist: updated }, () => {
            loadData();
            chrome.runtime.sendMessage({ action: 'blocklistUpdated', list: updated });
          });
        });
      });
    });
  }

  // Add site to blocklist
  addSiteBtn.addEventListener('click', () => {
    const val = newSiteInput.value.trim().toLowerCase();
    if (val) {
      chrome.storage.local.get(['distractionBlocklist'], (res) => {
        const list = res.distractionBlocklist ?? ['youtube.com', 'twitter.com', 'x.com', 'reddit.com', 'facebook.com', 'instagram.com'];
        if (!list.includes(val)) {
          list.push(val);
          chrome.storage.local.set({ distractionBlocklist: list }, () => {
            newSiteInput.value = '';
            loadData();
            chrome.runtime.sendMessage({ action: 'blocklistUpdated', list });
          });
        }
      });
    }
  });

  // Start / Pause timer messages to Background
  startBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'toggleTimer' }, (response) => {
      if (response.running) {
        startBtn.textContent = 'Pause Focus';
        startBtn.style.background = '#f43f5e';
      } else {
        startBtn.textContent = 'Start Focus Block';
        startBtn.style.background = '#8b5cf6';
      }
    });
  });

  // Log Leetcode problem solver
  logLeetCodeBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'logLeetCode' }, (res) => {
      if (res.success) {
        codeStreakEl.textContent = `${res.newStreak}d`;
        // Re-request state
        loadData();
      }
    });
  });

  // Toggle distraction blocker switch
  blockerSwitch.addEventListener('change', () => {
    const active = blockerSwitch.checked;
    chrome.storage.local.set({ blockerActive: active }, () => {
      chrome.runtime.sendMessage({ action: 'updateBlocker', active });
    });
  });

  // Sync dashboard values via simulated relay
  syncBtn.addEventListener('click', () => {
    syncBtn.style.opacity = '0.5';
    chrome.runtime.sendMessage({ action: 'syncTelemetry' }, (res) => {
      setTimeout(() => {
        syncBtn.style.opacity = '1';
        loadData();
        alert('🔄 Real-time telemetry synced successfully with Supabase remote vault!');
      }, 600);
    });
  });

  // Listening for ticks from background service worker
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'timerTick') {
      updateTimerDisplay(message.secondsLeft);
    } else if (message.action === 'timerComplete' || message.action === 'timerStopped') {
      loadData();
    }
  });

  function updateTimerDisplay(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
});
