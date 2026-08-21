import { EventName, EventPayloadMap } from './types';

type Handler<E extends EventName> = (payload: EventPayloadMap[E]) => void;

/**
 * Simple in-memory publish/subscribe event bus.
 * Services publish named events with typed payloads.
 * Other services subscribe to those events by name.
 */
export class EventBus {
  // Store handlers as a map from event name → array of callbacks.
  // We use `any` here only inside the private map; the public API is fully typed.
  private handlers: Map<EventName, Array<Handler<any>>> = new Map();

  /** Subscribe to an event. Returns an unsubscribe function. */
  subscribe<E extends EventName>(event: E, handler: Handler<E>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);

    return () => {
      const list = this.handlers.get(event);
      if (list) {
        const idx = list.indexOf(handler);
        if (idx !== -1) list.splice(idx, 1);
      }
    };
  }

  /** Publish an event, synchronously calling all registered handlers. */
  publish<E extends EventName>(event: E, payload: EventPayloadMap[E]): void {
    const list = this.handlers.get(event);
    if (!list || list.length === 0) return;
    // Iterate over a shallow copy so that unsubscribes inside handlers are safe.
    for (const handler of [...list]) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${event}":`, err);
      }
    }
  }
}
