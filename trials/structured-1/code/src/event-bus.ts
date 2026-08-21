/**
 * Event Bus — in-memory publish/subscribe implementation.
 * Services publish events here; other services subscribe to react to them.
 * No service imports another service directly; all cross-service communication
 * flows through this module (ADR-001).
 */

type EventCallback = (payload: unknown) => void;

export class EventBus {
  private readonly subscribers = new Map<string, EventCallback[]>();

  /**
   * Subscribe to an event. Multiple subscribers per event are supported.
   */
  subscribe(event: string, callback: EventCallback): void {
    const existing = this.subscribers.get(event) ?? [];
    existing.push(callback);
    this.subscribers.set(event, existing);
  }

  /**
   * Publish an event to all registered subscribers.
   * Subscribers are called synchronously in registration order.
   */
  publish(event: string, payload: unknown): void {
    const callbacks = this.subscribers.get(event) ?? [];
    for (const cb of callbacks) {
      try {
        cb(payload);
      } catch (err) {
        // Isolate subscriber failures so one bad subscriber cannot break others
        console.error(`[EventBus] Error in subscriber for "${event}":`, err);
      }
    }
  }
}

// Singleton instance shared across the whole application
export const eventBus = new EventBus();
