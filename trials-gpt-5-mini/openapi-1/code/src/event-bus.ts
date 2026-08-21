export type EventCallback = (payload: any) => void;

export class EventBus {
  private subscribers: Map<string, EventCallback[]> = new Map();

  subscribe(event: string, callback: EventCallback): void {
    const list = this.subscribers.get(event) ?? [];
    list.push(callback);
    this.subscribers.set(event, list);
  }

  publish(event: string, payload: any): void {
    const list = this.subscribers.get(event) ?? [];
    // call subscribers asynchronously but non-blocking
    for (const cb of list) {
      try {
        setImmediate(() => cb(payload));
      } catch (err) {
        // swallow
        // In real system, we would log
      }
    }
  }
}
