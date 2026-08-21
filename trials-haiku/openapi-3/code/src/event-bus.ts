/**
 * In-memory Event Bus
 * Provides publish/subscribe for inter-service communication
 */

type EventCallback = (payload: any) => void;

export class EventBus {
  private subscribers: Map<string, EventCallback[]> = new Map();

  /**
   * Publish an event to all subscribers
   */
  publish(event: string, payload: any): void {
    const callbacks = this.subscribers.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in event subscriber for "${event}":`, error);
        }
      });
    }
  }

  /**
   * Subscribe to an event
   */
  subscribe(event: string, callback: EventCallback): void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event)!.push(callback);
  }
}

// Export singleton instance
export const eventBus = new EventBus();
