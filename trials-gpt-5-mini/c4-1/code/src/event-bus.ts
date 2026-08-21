export type EventCallback = (payload: any) => void;

export class EventBus {
  private subscribers: Map<string, Set<EventCallback>> = new Map();

  subscribe(event: string, cb: EventCallback): void {
    if (!this.subscribers.has(event)) this.subscribers.set(event, new Set());
    this.subscribers.get(event)!.add(cb);
  }

  publish(event: string, payload: any): void {
    const subs = this.subscribers.get(event);
    if (!subs) return;
    // Call synchronously
    for (const cb of Array.from(subs)) {
      try {
        cb(payload);
      } catch (err) {
        // swallow errors to keep bus resilient
        // eslint-disable-next-line no-console
        console.error('Event handler error for', event, err);
      }
    }
  }
}
