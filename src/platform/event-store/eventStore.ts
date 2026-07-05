import type { StorageAdapter } from '../storage/storageAdapter';
import { LocalStorageAdapter } from '../storage/storageAdapter';
import { eventBroker } from '../event-broker/eventBroker';

export interface BaseEvent {
  id: string;
  timestamp: number;
  source: 'manual' | 'voice' | 'quickAction' | 'automation';
  metadata: {
    device: string;
    offline: boolean;
    version: number;
  };
}

export interface WaterLoggedEvent extends BaseEvent {
  type: 'water.logged';
  payload: {
    amountMl: number;
  };
}

export interface SleepLoggedEvent extends BaseEvent {
  type: 'sleep.logged';
  payload: {
    totalMinutes: number;
    quality: number;
  };
}

export interface FocusCompletedEvent extends BaseEvent {
  type: 'focus.completed';
  payload: {
    durationMinutes: number;
    taskName?: string;
  };
}

export type AppEvent = 
  | WaterLoggedEvent 
  | SleepLoggedEvent 
  | FocusCompletedEvent;

export interface Snapshot<T = any> {
  version: number;
  timestamp: number;
  state: T;
  lastEventId: string;
}

export class EventStoreImpl {
  private events: AppEvent[] = [];
  private adapter: StorageAdapter;
  private readonly EVENT_STORAGE_KEY = 'aip_event_logs';
  private readonly SNAPSHOT_STORAGE_KEY = 'aip_state_snapshot';

  constructor(adapter?: StorageAdapter) {
    this.adapter = adapter || new LocalStorageAdapter();
  }

  /**
   * Initializes the event store by loading events and checking for snapshots.
   */
  public async init(): Promise<void> {
    try {
      const storedEvents = await this.adapter.getItem<AppEvent[]>(this.EVENT_STORAGE_KEY);
      if (storedEvents && Array.isArray(storedEvents)) {
        this.events = storedEvents;
      }
    } catch (e) {
      console.error('[EventStore] Failed to initialize event logs:', e);
    }
  }

  /**
   * Append a new event to the ledger and dispatch it to the broker.
   */
  public async append(event: AppEvent): Promise<void> {
    this.events.push(event);
    await this.adapter.setItem(this.EVENT_STORAGE_KEY, this.events);
    
    // Dispatch event to local subscribers asynchronously
    await eventBroker.publish(event.type, event);
    await eventBroker.publish('*', event); // wildcard topic
  }

  /**
   * Retrieve all events.
   */
  public getEvents(): AppEvent[] {
    return [...this.events];
  }

  /**
   * Replays events sequentially on a given reducer to compute a read model.
   */
  public replay<T>(initialState: T, reducer: (state: T, event: AppEvent) => T): T {
    return this.events.reduce(reducer, initialState);
  }

  /**
   * Save a snapshot checkpoint of the state.
   */
  public async saveSnapshot<T>(state: T, lastEventId: string, version: number): Promise<void> {
    const snapshot: Snapshot<T> = {
      version,
      timestamp: Date.now(),
      state,
      lastEventId,
    };
    await this.adapter.setItem(this.SNAPSHOT_STORAGE_KEY, snapshot);
  }

  /**
   * Load the latest snapshot.
   */
  public async loadSnapshot<T>(): Promise<Snapshot<T> | null> {
    return await this.adapter.getItem<Snapshot<T>>(this.SNAPSHOT_STORAGE_KEY);
  }

  /**
   * Wipe all events and snapshot files.
   */
  public async clearAll(): Promise<void> {
    this.events = [];
    await this.adapter.removeItem(this.EVENT_STORAGE_KEY);
    await this.adapter.removeItem(this.SNAPSHOT_STORAGE_KEY);
  }
}

export const eventStore = new EventStoreImpl();
