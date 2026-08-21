/**
 * Event Bus — In-memory publish/subscribe implementation.
 * All inter-service communication flows through here.
 */

type EventCallback = (payload: unknown) => void;

export class EventBus {
  private subscribers: Map<string, EventCallback[]> = new Map();

  /**
   * Subscribe to an event. Multiple subscribers per event are supported.
   */
  subscribe(event: string, callback: EventCallback): void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event)!.push(callback);
  }

  /**
   * Publish an event. All registered subscribers are called synchronously.
   */
  publish(event: string, payload: unknown): void {
    const callbacks = this.subscribers.get(event) ?? [];
    for (const cb of callbacks) {
      cb(payload);
    }
  }
}
