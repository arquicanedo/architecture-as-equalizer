export type EventCallback = (payload: any) => void;

export class EventBus {
  private subscribers: Map<string, Set<EventCallback>> = new Map();

  publish(event: string, payload: any): void {
    const subs = this.subscribers.get(event);
    if (!subs || subs.size === 0) return;
    // Deliver synchronously for simplicity
    for (const cb of subs) {
      try {
        cb(payload);
      } catch (err) {
        // Swallow subscriber errors to avoid breaking other subscribers
        // In a real system, we'd log this
      }
    }
  }

  subscribe(event: string, callback: EventCallback): void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event)!.add(callback);
  }
}
