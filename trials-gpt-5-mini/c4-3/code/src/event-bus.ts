type Callback = (payload: any) => void;

export class EventBus {
  private subscribers: Map<string, Set<Callback>> = new Map();

  publish(event: string, payload: any): void {
    const subs = this.subscribers.get(event);
    if (!subs) return;
    for (const cb of subs) {
      // deliver asynchronously to avoid blocking
      setImmediate(() => {
        try {
          cb(payload);
        } catch (err) {
          // swallow
          console.error('Event handler error for', event, err);
        }
      });
    }
  }

  subscribe(event: string, callback: Callback): void {
    const subs = this.subscribers.get(event) ?? new Set();
    subs.add(callback);
    this.subscribers.set(event, subs);
  }
}
