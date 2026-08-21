/**
 * EventBus — a simple in-memory publish/subscribe system.
 *
 * Services publish named events with arbitrary payloads.
 * Other services subscribe to event names and receive callbacks
 * whenever a matching event is published.
 *
 * No service should import another service directly; all
 * cross-service communication flows through this bus.
 */

export type EventHandler<T = unknown> = (payload: T) => void;

export interface BusEvent<T = unknown> {
  name: string;
  payload: T;
}

export class EventBus {
  // Map from event name → list of handlers
  private readonly handlers: Map<string, EventHandler<unknown>[]> = new Map();

  /**
   * Subscribe to an event by name.
   * Returns an unsubscribe function for cleanup.
   */
  subscribe<T>(eventName: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    // Cast is safe: we only call T-typed handlers with T-typed payloads
    this.handlers.get(eventName)!.push(handler as EventHandler<unknown>);

    return () => {
      const list = this.handlers.get(eventName);
      if (list) {
        const idx = list.indexOf(handler as EventHandler<unknown>);
        if (idx !== -1) list.splice(idx, 1);
      }
    };
  }

  /**
   * Publish an event to all current subscribers.
   * Handlers are called synchronously in subscription order.
   */
  publish<T>(eventName: string, payload: T): void {
    const list = this.handlers.get(eventName);
    if (!list || list.length === 0) return;
    // Snapshot the list so mid-iteration unsubscribes are safe
    for (const handler of [...list]) {
      handler(payload as unknown);
    }
  }

  /** Return the number of subscribers for a given event (useful for tests/debug). */
  subscriberCount(eventName: string): number {
    return this.handlers.get(eventName)?.length ?? 0;
  }
}
