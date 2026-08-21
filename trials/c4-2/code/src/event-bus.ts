/**
 * Event Bus — in-memory publish/subscribe message broker.
 * Services publish events here; other services subscribe to react.
 */

type EventCallback = (payload: unknown) => void;

export class EventBus {
  private subscribers: Map<string, EventCallback[]> = new Map();

  subscribe(event: string, callback: EventCallback): void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event)!.push(callback);
  }

  publish(event: string, payload: unknown): void {
    const callbacks = this.subscribers.get(event);
    if (!callbacks || callbacks.length === 0) return;
    for (const cb of callbacks) {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[EventBus] Error in subscriber for "${event}":`, err);
      }
    }
  }
}

// Singleton instance shared across the application
export const eventBus = new EventBus();
