/**
 * Event Bus — In-memory publish/subscribe message broker.
 * Services publish events here; other services subscribe to react.
 * No service imports another service directly; all inter-service
 * communication flows through this bus.
 */

type Callback = (payload: unknown) => void;

export class EventBus {
  private subscribers: Map<string, Callback[]> = new Map();

  /**
   * Register a callback to be invoked whenever `event` is published.
   */
  subscribe(event: string, callback: Callback): void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event)!.push(callback);
  }

  /**
   * Publish an event, synchronously invoking all registered subscribers.
   */
  publish(event: string, payload: unknown): void {
    const callbacks = this.subscribers.get(event) ?? [];
    for (const cb of callbacks) {
      try {
        cb(payload);
      } catch (err) {
        // Prevent a bad subscriber from breaking the publisher
        console.error(`[EventBus] Error in subscriber for "${event}":`, err);
      }
    }
  }
}
