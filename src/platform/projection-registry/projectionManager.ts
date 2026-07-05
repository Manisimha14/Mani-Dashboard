import type { AppEvent } from '../event-store/eventStore';
import { projectionRegistry } from '../event-store/projections';
import { eventUpcasterRegistry } from '../event-store/upcaster';

export class ProjectionManager {
  /**
   * Wipes projected states, upcasts versioned events, and replays sequentially.
   * Utilises batch throttling to prevent browser main-thread rendering freezes.
   */
  public static async rebuild(events: AppEvent[]): Promise<number> {
    const startTime = performance.now();
    console.log(`[ProjectionManager] Starting rebuild on ${events.length} events...`);

    // 1. Wipe projections
    projectionRegistry.projectAll([]);

    // 2. Throttle batch loops (Backpressure check)
    const BATCH_SIZE = 100;
    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const batch = events.slice(i, i + BATCH_SIZE);
      
      batch.forEach(evt => {
        // Upcast to modern version schemas prior to projection
        const upgraded = eventUpcasterRegistry.upcast(evt);
        projectionRegistry.project(upgraded);
      });

      // Yield event loop execution thread to prevent render freezes
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    const duration = performance.now() - startTime;
    console.log(`[ProjectionManager] Rebuild complete in ${duration.toFixed(2)} ms.`);
    return duration;
  }
}
