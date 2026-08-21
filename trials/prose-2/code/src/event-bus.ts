import { EventMap, EventName } from "./types";

// A typed subscriber callback for a given event name
type Subscriber<K extends EventName> = (payload: EventMap[K]) => void;

/**
 * EventBus — a simple in-memory publish/subscribe system.
 *
 * Services publish named events with a typed payload. Any number of other
 * services may subscribe to those events and will be called synchronously
 * when the event is published.
 */
export class EventBus {
  // We store subscribers as a map from event name → array of callbacks.
  // The `any` here is intentional: we enforce type safety through the
  // publish / subscribe generics at the call site.
  private subscribers: Map<string, Array<(payload: unknown) => void>> =
    new Map();

  /**
   * Subscribe to an event.  The callback receives the strongly-typed payload
   * for that event name.
   */
  subscribe<K extends EventName>(event: K, callback: Subscriber<K>): void {
    const list = this.subscribers.get(event) ?? [];
    list.push(callback as (payload: unknown) => void);
    this.subscribers.set(event, list);
  }

  /**
   * Publish an event.  All subscribers registered for `event` are called
   * synchronously in the order they subscribed.
   */
  publish<K extends EventName>(event: K, payload: EventMap[K]): void {
    const list = this.subscribers.get(event) ?? [];
    for (const cb of list) {
      cb(payload);
    }
  }
}
