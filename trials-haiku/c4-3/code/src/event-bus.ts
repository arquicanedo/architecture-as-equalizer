/**
 * Event Bus
 * In-memory pub/sub message broker for service communication
 */

export type EventCallback = (payload: any) => void;

export class EventBus {
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
    const callbacks = this.subscribers.get(event) || [];
    callbacks.forEach((callback) => {
      try {
        callback(payload);
      } catch (error) {
        console.error(`Error in event subscriber for ${event}:`, error);
      }
    });
  }
}

export const eventBus = new EventBus();
