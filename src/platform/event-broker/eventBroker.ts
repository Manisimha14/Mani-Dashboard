/**
 * Event Broker contract & implementation.
 * Provides asynchronous publish/subscribe dispatcher mechanisms.
 */

export interface AppMessage<T = any> {
  id: string;
  topic: string;
  timestamp: number;
  payload: T;
}

export type MessageHandler<T = any> = (msg: AppMessage<T>) => void;

class EventBrokerImpl {
  private subscribers: Map<string, Set<MessageHandler>> = new Map();
  private messageHistory: AppMessage[] = [];

  /**
   * Publish a message to all subscribers of a topic.
   */
  private deadLetterQueue: Array<{ message: AppMessage; error: any; timestamp: number }> = [];

  /**
   * Publish a message to all subscribers of a topic.
   */
  public async publish<T = any>(topic: string, payload: T, source?: string): Promise<void> {
    const message: AppMessage<T> = {
      id: Math.random().toString(36).substring(2, 9),
      topic,
      timestamp: Date.now(),
      payload,
    };

    this.messageHistory.push(message);
    
    // Cap history size to prevent memory leaks
    if (this.messageHistory.length > 500) {
      this.messageHistory.shift();
    }

    const handlers = this.subscribers.get(topic);
    if (handlers) {
      handlers.forEach(handler => {
        // Execute handlers in a setTimeout microtask to make them asynchronous
        setTimeout(() => {
          let attempts = 0;
          const maxAttempts = 3;

          const executeWithRetry = () => {
            try {
              handler(message);
            } catch (err) {
              attempts++;
              if (attempts < maxAttempts) {
                console.warn(`[EventBroker] Handler failed. Retrying attempt ${attempts}/${maxAttempts}...`);
                setTimeout(executeWithRetry, attempts * 50); // Exponential backoff retry
              } else {
                console.error(`[EventBroker] Handler failed after ${maxAttempts} attempts. Moving to DLQ.`, err);
                this.deadLetterQueue.push({
                  message,
                  error: err instanceof Error ? err.message : String(err),
                  timestamp: Date.now(),
                });
                
                // Cap DLQ size
                if (this.deadLetterQueue.length > 100) {
                  this.deadLetterQueue.shift();
                }
              }
            }
          };

          executeWithRetry();
        }, 0);
      });
    }
  }

  /**
   * Expose Dead Letter Queue logs.
   */
  public getDLQ(): Array<{ message: AppMessage; error: any; timestamp: number }> {
    return [...this.deadLetterQueue];
  }

  /**
   * Subscribe a handler to a topic.
   */
  public subscribe<T = any>(topic: string, handler: MessageHandler<T>): void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic)!.add(handler);
  }

  /**
   * Unsubscribe a handler from a topic.
   */
  public unsubscribe<T = any>(topic: string, handler: MessageHandler<T>): void {
    const handlers = this.subscribers.get(topic);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscribers.delete(topic);
      }
    }
  }

  /**
   * Returns current active message history.
   */
  public history(): AppMessage[] {
    return [...this.messageHistory];
  }

  /**
   * Clears historical buffers.
   */
  public clear(): void {
    this.messageHistory = [];
  }
}

export const eventBroker = new EventBrokerImpl();
