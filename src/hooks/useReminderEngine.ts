import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { todayString, generateId } from '../lib/utils';
import type { Reminder, AppNotification, ISODateString } from '../types/reminder';
import { isAfter, parseISO, addMinutes, addDays, addWeeks, addMonths, setHours, setMinutes } from 'date-fns';

export function useReminderEngine() {
  const { 
    reminders, updateReminder, 
    notifications, addNotification, 
    reminderSettings, dailyActivity,
    userSettings
  } = useAppStore();

  const checkInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  const triggerNotification = useCallback((reminder: Reminder) => {
    // 1. Check Quiet Hours
    if (reminderSettings.quietHours.enabled) {
      const now = new Date();
      const [startH, startM] = reminderSettings.quietHours.start.split(':').map(Number);
      const [endH, endM] = reminderSettings.quietHours.end.split(':').map(Number);
      
      const startTime = setMinutes(setHours(new Date(), startH), startM);
      const endTime = setMinutes(setHours(new Date(), endH), endM);

      // Simple range check
      if (now >= startTime || now <= endTime) return;
    }

    // 2. Check Focus Mode
    // (Assuming focus mode is a global state, if needed we can block here)

    // 3. Browser Notification
    if (reminderSettings.browserNotificationsEnabled && Notification.permission === 'granted') {
      new Notification(reminder.title, {
        body: reminder.message,
        icon: '/favicon.ico',
        tag: reminder.id,
      });
    }

    // 4. In-App Notification
    addNotification({
      title: reminder.title,
      message: reminder.message,
      category: 'reminders',
      priority: 'normal',
      createdAt: new Date().toISOString() as ISODateString,
      updatedAt: new Date().toISOString() as ISODateString,
      metadata: { type: 'system', source: 'reminder-engine', reminderId: reminder.id }
    });

    // 5. Update last triggered
    updateReminder(reminder.id, { lastTriggeredAt: new Date().toISOString() as ISODateString });

    // 6. Handle Recurrence
    if (reminder.recurrence !== 'none') {
      let nextDate = parseISO(reminder.scheduledAt);
      
      switch (reminder.recurrence) {
        case 'daily': nextDate = addDays(nextDate, 1); break;
        case 'weekly': nextDate = addWeeks(nextDate, 1); break;
        case 'monthly': nextDate = addMonths(nextDate, 1); break;
        case 'weekdays': 
          nextDate = addDays(nextDate, 1);
          while (nextDate.getDay() === 0 || nextDate.getDay() === 6) nextDate = addDays(nextDate, 1);
          break;
        case 'weekends':
          nextDate = addDays(nextDate, 1);
          while (nextDate.getDay() !== 0 && nextDate.getDay() !== 6) nextDate = addDays(nextDate, 1);
          break;
      }

      updateReminder(reminder.id, { scheduledAt: nextDate.toISOString() as ISODateString });
    } else {
      updateReminder(reminder.id, { enabled: false, completed: true });
    }
  }, [reminderSettings, addNotification, updateReminder]);

  const runCheck = useCallback(() => {
    const now = new Date();

    // Check scheduled reminders
    reminders.forEach(r => {
      if (!r.enabled || r.completed) return;
      
      // Snooze check
      if (r.snoozedUntil && isAfter(parseISO(r.snoozedUntil), now)) return;

      if (isAfter(now, parseISO(r.scheduledAt))) {
        triggerNotification(r);
      }
    });

    // Smart Intelligence Engine
    if (reminderSettings.smartRemindersEnabled) {
      const today = dailyActivity.find(a => a.date === todayString());
      const hours = now.getHours();
      
      // 1. Focus Inactivity (Nudge at 2 PM if no focus)
      if (hours === 14 && (!today || today.focusMinutes < 15)) {
        const id = 'smart-focus-nudge';
        if (!notifications.find(n => n.timestamp.startsWith(todayString()) && n.title.includes('Deep Work'))) {
          addNotification({
            title: 'Neural Engine Idle',
            message: 'No deep work detected today. Want a quick 15m startup session? 🌱',
            category: 'focus',
            priority: 'normal',
            createdAt: new Date().toISOString() as ISODateString,
            updatedAt: new Date().toISOString() as ISODateString,
          });
        }
      }

      // 2. Reading Goal Behind (Nudge at 6 PM if no chapters)
      if (hours === 18 && (!today || today.chaptersRead === 0)) {
        if (!notifications.find(n => n.timestamp.startsWith(todayString()) && n.title.includes('Library'))) {
          addNotification({
            title: 'Library Silence',
            message: 'Your reading streak is waiting. Even one page counts as progress. 📚',
            category: 'reminders',
            priority: 'normal',
            createdAt: new Date().toISOString() as ISODateString,
            updatedAt: new Date().toISOString() as ISODateString,
          });
        }
      }

      // 3. LeetCode Streak at Risk (Nudge at 9 PM if no problems)
      if (hours === 21 && (!today || today.problemsSolved === 0)) {
        if (!notifications.find(n => n.timestamp.startsWith(todayString()) && n.title.includes('Logic'))) {
          addNotification({
            title: 'Logic Pulse Fading',
            message: 'Your coding streak needs a pulse. Solve one quick problem to keep it alive! 🔥',
            category: 'streak',
            priority: 'normal',
            createdAt: new Date().toISOString() as ISODateString,
            updatedAt: new Date().toISOString() as ISODateString,
          });
        }
      }
    }
  }, [reminders, triggerNotification, reminderSettings, dailyActivity, notifications, addNotification]);

  useEffect(() => {
    requestPermission();
    checkInterval.current = setInterval(runCheck, 60000); // Check every minute
    runCheck(); // Initial check

    return () => {
      if (checkInterval.current) clearInterval(checkInterval.current);
    };
  }, [runCheck, requestPermission]);

  return { requestPermission };
}
