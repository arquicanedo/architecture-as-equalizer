export type EventCallback<T = any> = (payload: T) => void;

export class EventBus {
  private subscribers: Map<string, Set<EventCallback>> = new Map();

  publish<T = any>(event: string, payload: T): void {
    const subs = this.subscribers.get(event);
    if (!subs || subs.size === 0) return;
    for (const cb of subs) {
      try {
        // Call subscribers synchronously; simple and predictable for in-memory bus
        cb(payload);
      } catch (err) {
        // Swallow errors from subscribers to avoid affecting others
        console.error(`Error in subscriber for event ${event}:`, err);
      }
    }
  }

  subscribe<T = any>(event: string, callback: EventCallback<T>): void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event)!.add(callback as EventCallback);
  }
}
