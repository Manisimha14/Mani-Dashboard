/**
 * Command Idempotency Deduplication.
 * Ensures duplicate sync command dispatches are ignored.
 */

class IdempotencyStoreImpl {
  private processedCommands: Set<string> = new Set();

  /**
   * Check if a command ID has already been executed.
   */
  public hasProcessed(commandId: string): boolean {
    return this.processedCommands.has(commandId);
  }

  /**
   * Records a command ID as executed.
   */
  public record(commandId: string): void {
    this.processedCommands.add(commandId);
    
    // Cap memory footprint to 10,000 commands
    if (this.processedCommands.size > 10000) {
      const first = Array.from(this.processedCommands)[0];
      this.processedCommands.delete(first);
    }
  }

  /**
   * Reset store.
   */
  public clear(): void {
    this.processedCommands.clear();
  }
}

export const idempotencyStore = new IdempotencyStoreImpl();
