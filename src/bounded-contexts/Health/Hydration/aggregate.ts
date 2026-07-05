import type { AppEvent } from '../../../platform/event-store/eventStore';

export interface HydrationState {
  totalLoggedMl: number;
  lastLoggedTimestamp: number;
}

export interface LogWaterCommand {
  type: 'LogWater';
  amountMl: number;
  source: 'manual' | 'voice' | 'quickAction' | 'automation';
}

export class HydrationAggregate {
  private state: HydrationState;

  constructor(history: AppEvent[]) {
    this.state = this.replay(history);
  }

  /**
   * Enforces business rules and invariants to handle LogWater commands.
   */
  public handle(command: LogWaterCommand): AppEvent {
    // Rule 1: Water intake volume must be positive
    if (command.amountMl <= 0) {
      throw new Error('Hydration intake volume must be positive.');
    }

    // Rule 2: Water daily limit check (safety alert limit at 10,000ml)
    if (this.state.totalLoggedMl + command.amountMl > 10000) {
      throw new Error('Hydration limit warning: Exceeded daily safety limits.');
    }

    // Rule 3: Avoid double submission logging (ignore duplicate entries within 2 seconds)
    const delay = Date.now() - this.state.lastLoggedTimestamp;
    if (delay < 2000) {
      throw new Error('Duplicate log entry flagged. Wait a moment before logging again.');
    }

    // Emit event
    return {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      type: 'water.logged',
      source: command.source,
      trackerId: 'water',
      payload: { amountMl: command.amountMl },
      metadata: {
        device: 'browser-client',
        offline: !navigator.onLine,
        version: 1
      }
    } as any;
  }

  private replay(history: AppEvent[]): HydrationState {
    const todayStr = new Date().toISOString().split('T')[0];
    return history.reduce((acc, event) => {
      // Replay only today's logs for daily total checks
      const eventDate = new Date(event.timestamp).toISOString().split('T')[0];
      if (event.type === 'water.logged' && eventDate === todayStr) {
        const payload = event.payload as { amountMl?: number } || {};
        acc.totalLoggedMl += payload.amountMl || 0;
        acc.lastLoggedTimestamp = event.timestamp;
      }
      return acc;
    }, { totalLoggedMl: 0, lastLoggedTimestamp: 0 });
  }
}
