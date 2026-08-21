/**
 * Event Bus — in-memory publish/subscribe message broker.
 * Services publish events here; other services subscribe to react to them.
 * No direct service-to-service imports are needed.
 */

type EventCallback = (payload: unknown) => void;

export class EventBus {
  private subscribers: Map<string, EventCallback[]> = new Map();

  /** Register a callback for a named event. */
  subscribe(event: string, callback: EventCallback): void {
    const existing = this.subscribers.get(event) ?? [];
    this.subscribers.set(event, [...existing, callback]);
  }

  /** Publish an event to all registered subscribers synchronously. */
  publish(event: string, payload: unknown): void {
    const callbacks = this.subscribers.get(event) ?? [];
    for (const cb of callbacks) {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[EventBus] Error in subscriber for "${event}":`, err);
      }
    }
  }
}

/** Singleton instance shared across the application. */
export const eventBus = new EventBus();
