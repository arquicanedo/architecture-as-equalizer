/**
 * Event Bus — in-memory publish/subscribe
 * All inter-service communication flows through here.
 */

type Callback = (payload: any) => void;

export class EventBus {
  private subscribers: Map<string, Callback[]> = new Map();

  subscribe(event: string, callback: Callback): void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event)!.push(callback);
  }

  publish(event: string, payload: any): void {
    const handlers = this.subscribers.get(event);
    if (!handlers || handlers.length === 0) return;
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] Error in handler for event "${event}":`, err);
      }
    }
  }
}
