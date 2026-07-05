import { eventStore } from '../../../platform/event-store/eventStore';
import { projectionRegistry } from '../../../platform/event-store/projections';
import { FocusAggregate } from './aggregate';
import type { CompleteFocusCommand } from './aggregate';

export class FocusApplicationService {
  /**
   * Dispatches a CompleteFocusCommand, runs aggregate invariants validation, appends events to ledger and updates read model projections.
   */
  public static async completeFocus(command: Omit<CompleteFocusCommand, 'type'>): Promise<void> {
    // 1. Retrieve history logs
    const history = eventStore.getEvents();

    // 2. Load aggregate and execute Command logic
    const aggregate = new FocusAggregate(history);
    const event = aggregate.handle({
      type: 'CompleteFocus',
      ...command
    });

    // 3. Append to EventStore and project
    await eventStore.append(event);
    projectionRegistry.project(event);
  }
}
