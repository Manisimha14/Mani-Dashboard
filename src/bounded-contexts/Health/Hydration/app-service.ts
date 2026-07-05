import { eventStore } from '../../../platform/event-store/eventStore';
import { projectionRegistry } from '../../../platform/event-store/projections';
import { HydrationAggregate } from './aggregate';
import type { LogWaterCommand } from './aggregate';

export class HydrationApplicationService {
  /**
   * Dispatches a LogWaterCommand, runs aggregate invariants validation, appends events to ledger and updates read model projections.
   */
  public static async logWater(command: Omit<LogWaterCommand, 'type'>): Promise<void> {
    // 1. Retrieve history logs
    const history = eventStore.getEvents();

    // 2. Load aggregate and execute Command logic
    const aggregate = new HydrationAggregate(history);
    const event = aggregate.handle({
      type: 'LogWater',
      ...command
    });

    // 3. Append to EventStore and project
    await eventStore.append(event);
    projectionRegistry.project(event);
  }
}
