/**
 * Event Upcasters Registry.
 * Handles migration of historical versioned events into modern event schemas.
 */

export interface Upcaster {
  sourceVersion: number;
  targetVersion: number;
  upcast(event: any): any;
}

class EventUpcasterRegistryImpl {
  private upcasters: Map<string, Upcaster[]> = new Map();

  constructor() {
    this.registerDefaults();
  }

  /**
   * Registers a version schema upcaster for an event type.
   */
  public register(eventType: string, upcaster: Upcaster): void {
    const list = this.upcasters.get(eventType) || [];
    list.push(upcaster);
    // Sort ascending by source version
    this.upcasters.set(eventType, list.sort((a, b) => a.sourceVersion - b.sourceVersion));
  }

  /**
   * Upcasts an event sequentially across all registered migrations.
   */
  public upcast(event: { type: string; metadata: { version: number }; payload: any }): any {
    let currentEvent = { ...event };
    const list = this.upcasters.get(event.type) || [];

    for (const upcaster of list) {
      if (currentEvent.metadata.version === upcaster.sourceVersion) {
        currentEvent = upcaster.upcast(currentEvent);
      }
    }

    return currentEvent;
  }

  /**
   * Count registered upcasters.
   */
  public getUpcasterCount(): number {
    let count = 0;
    this.upcasters.forEach(list => {
      count += list.length;
    });
    return count;
  }

  private registerDefaults(): void {
    // Example Upcaster: water.logged v1 -> v2 (adding source tag if missing)
    this.register('water.logged', {
      sourceVersion: 1,
      targetVersion: 2,
      upcast: (event) => {
        return {
          ...event,
          payload: {
            ...event.payload,
            source: event.payload.source || 'unspecified'
          },
          metadata: {
            ...event.metadata,
            version: 2
          }
        };
      }
    });
  }
}

export const eventUpcasterRegistry = new EventUpcasterRegistryImpl();
