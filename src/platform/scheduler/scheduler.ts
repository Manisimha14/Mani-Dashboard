/**
 * Local Task Scheduler for delayed actions and policies.
 */

export interface ScheduledTask {
  id: string;
  triggerTime: number;
  action: () => void;
  description: string;
}

class SchedulerImpl {
  private tasks: Map<string, ScheduledTask> = new Map();
  private timers: Map<string, any> = new Map();

  /**
   * Schedule a deferred action.
   */
  public schedule(id: string, delayMinutes: number, action: () => void, description = ''): void {
    this.cancel(id); // Cancel any pre-existing duplicate schedule

    const triggerTime = Date.now() + delayMinutes * 60 * 1000;
    const task: ScheduledTask = { id, triggerTime, action, description };
    
    this.tasks.set(id, task);

    const timer = setTimeout(() => {
      try {
        action();
      } catch (e) {
        console.error(`[Scheduler] Error running task ${id}:`, e);
      } finally {
        this.tasks.delete(id);
        this.timers.delete(id);
      }
    }, delayMinutes * 60 * 1000);

    this.timers.set(id, timer);
  }

  /**
   * Cancel a scheduled task.
   */
  public cancel(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.tasks.delete(id);
  }

  /**
   * Get all active scheduled tasks.
   */
  public getActiveTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Clears all timers.
   */
  public clear(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.tasks.clear();
  }
}

export const scheduler = new SchedulerImpl();
