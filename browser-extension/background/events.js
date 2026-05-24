// background/events.js - Companion Telemetry & Normalizer

/**
 * Listen for messages from site observation content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle LeetCode solve tracking
  if (message.action === 'logLeetCodeSolve') {
    const { title, slug, difficulty } = message.payload || {};
    
    const normalizedPayload = {
      title: title || 'LeetCode Problem',
      slug: slug || 'leetcode-problem',
      difficulty: difficulty || 'Medium',
      timeSpent: 25 // standard session estimation
    };

    console.log(`🧠 Normalizing LeetCode Telemetry: "${normalizedPayload.title}" [${normalizedPayload.difficulty}]`);

    // Queue into durable event outbox
    enqueueSyncEvent('leetcode_problem_solved', normalizedPayload)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((err) => {
        console.error('Failed to queue LeetCode solved event:', err);
        sendResponse({ success: false });
      });

    return true; // Keep response channel active
  }

  // Handle Focus Block Complete tracking
  if (message.action === 'logFocusBlockComplete') {
    const { duration, taskName, growthTheme, ambience } = message.payload || {};

    const normalizedPayload = {
      duration: duration || 25,
      taskName: taskName || 'Focus Block via Companion',
      growthTheme: growthTheme || 'tree',
      ambience: ambience || 'none'
    };

    console.log(`🧠 Normalizing Focus Telemetry: ${normalizedPayload.duration}m in ${normalizedPayload.taskName}`);

    enqueueSyncEvent('focus_session_completed', normalizedPayload)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((err) => {
        console.error('Failed to queue focus completed event:', err);
        sendResponse({ success: false });
      });

    return true;
  }
});
