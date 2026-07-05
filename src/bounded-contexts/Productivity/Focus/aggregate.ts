import type { AppEvent } from '../../../platform/event-store/eventStore';

export interface FocusState {
  isFocusing: boolean;
  lastSessionTime: number;
}

export interface CompleteFocusCommand {
  type: 'CompleteFocus';
  durationMinutes: number;
  taskName?: string;
  source: 'manual' | 'voice' | 'quickAction' | 'automation';
}

export class FocusAggregate {
  private state: FocusState;

  constructor(history: AppEvent[]) {
    this.state = this.replay(history);
  }

  /**
   * Enforces rules and checks invariants for Focus completing.
   */
  public handle(command: CompleteFocusCommand): AppEvent {
    // Focus Rule 1: Sane session durations (between 1 minute and 180 minutes)
    if (command.durationMinutes < 1 || command.durationMinutes > 180) {
      throw new Error('Focus session duration must be between 1 and 180 minutes.');
    }

    // Focus Rule 2: Minimum transition interval (must wait at least 10s between logging focus sessions)
    const interval = Date.now() - this.state.lastSessionTime;
    if (interval < 10000) {
      throw new Error('You logged another focus session too recently.');
    }

    return {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      type: 'focus.completed',
      source: command.source,
      trackerId: 'focus',
      payload: {
        durationMinutes: command.durationMinutes,
        taskName: command.taskName || 'Pomodoro focus session'
      },
      metadata: {
        device: 'browser-client',
        offline: !navigator.onLine,
        version: 1
      }
    } as any;
  }

  private replay(history: AppEvent[]): FocusState {
    return history.reduce((acc, event) => {
      if (event.type === 'focus.completed') {
        acc.lastSessionTime = event.timestamp;
      }
      return acc;
    }, { isFocusing: false, lastSessionTime: 0 });
  }
}
