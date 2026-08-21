/**
 * Event Bus - In-memory pub/sub for inter-service communication
 * No direct service-to-service calls allowed. All communication goes through this bus.
 */

type EventCallback = (payload: any) => void;

class EventBus {
  private subscribers: Map<string, EventCallback[]> = new Map();

  /**
   * Subscribe to an event
   */
  subscribe(event: string, callback: EventCallback): void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event)!.push(callback);
  }

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
          console.error(`Error in subscriber for event '${event}':`, error);
        }
      });
    }
  }
}

export const eventBus = new EventBus();
