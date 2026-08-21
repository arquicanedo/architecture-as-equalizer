// ─── Event Bus ───────────────────────────────────────────────────────────────
// In-memory publish/subscribe hub for inter-service communication.
// Services MUST NOT import each other; they communicate exclusively through here.

type EventCallback = (payload: unknown) => void;

class EventBus {
  private subscribers: Map<string, EventCallback[]> = new Map();

  /** Subscribe to a named event. Multiple subscribers per event are supported. */
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
        // Isolate subscriber errors so a bad handler cannot break the publisher
        console.error(`[EventBus] Error in subscriber for "${event}":`, err);
      }
    }
  }
}

// Singleton instance shared across the whole application
export const eventBus = new EventBus();
