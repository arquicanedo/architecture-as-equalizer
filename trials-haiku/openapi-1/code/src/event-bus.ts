/**
 * In-memory Event Bus for inter-service communication.
 * Services publish events and other services subscribe to them.
 */

type EventCallback = (payload: any) => void;

class EventBus {
  private subscribers: Map<string, EventCallback[]> = new Map();

  /**
   * Publish an event with a payload.
   * All subscribers to this event type will be called.
   */
  publish(event: string, payload: any): void {
    const callbacks = this.subscribers.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(payload);
      } catch (error) {
        console.error(`Error in event subscriber for ${event}:`, error);
      }
    });
  }

  /**
   * Subscribe to an event.
   * Returns an unsubscribe function.
   */
  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Clear all subscribers for testing purposes.
   */
  clear(): void {
    this.subscribers.clear();
  }
}

export const eventBus = new EventBus();
