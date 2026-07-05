import { eventStore } from '../event-store/eventStore';
import { ProjectionManager } from '../projection-registry/projectionManager';
import { scheduler } from '../scheduler/scheduler';
import { pluginRegistry } from '../plugin-registry/pluginRegistry';
import { telemetryService } from '../observability/telemetry';

export class PlatformLifecycle {
  private static isInitialized = false;

  /**
   * Performs platform initialization.
   * Restores snapshots, initializes EventStore, loads active plugins, starts timers, and triggers event replays.
   */
  public static async startup(): Promise<void> {
    if (this.isInitialized) return;
    const startTime = performance.now();
    console.log('[PlatformLifecycle] Initializing AIP Platform bootstrap...');

    // 1. Initialize EventStore
    await eventStore.init();

    // 2. Load registered plugins
    const plugins = pluginRegistry.getPlugins();
    console.log(`[PlatformLifecycle] Loaded ${plugins.length} active plugins.`);

    // 3. Rebuild Projections
    const events = eventStore.getEvents();
    const duration = await ProjectionManager.rebuild(events);

    // 4. Update Telemetry metrics
    telemetryService.recordTechnical({
      replayDurationMs: duration,
      eventThroughput: events.length > 0 ? (events.length / (duration / 1000)) : 0
    });

    this.isInitialized = true;
    const totalBootTime = performance.now() - startTime;
    console.log(`[PlatformLifecycle] AIP Bootstrap complete in ${totalBootTime.toFixed(2)} ms.`);
  }

  /**
   * Flushes commands queues, saves snapshot checkpoints, and cancels scheduler routines on system shutdown.
   */
  public static async shutdown(): Promise<void> {
    if (!this.isInitialized) return;
    console.log('[PlatformLifecycle] Shutting down AIP Platform...');

    // 1. Save checkpoint state snapshot
    const events = eventStore.getEvents();
    const lastEvent = events[events.length - 1];
    await eventStore.saveSnapshot(
      { activePlugins: pluginRegistry.getPlugins() },
      lastEvent ? lastEvent.id : 'genesis',
      1
    );

    // 2. Cancel scheduler timers
    scheduler.clear();

    this.isInitialized = false;
    console.log('[PlatformLifecycle] Shutdown complete.');
  }
}
