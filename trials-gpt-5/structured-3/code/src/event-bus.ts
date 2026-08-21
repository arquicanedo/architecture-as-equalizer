export type EventCallback = (payload: any) => void;

export class EventBus {
  private subscribers: Map<string, EventCallback[]> = new Map();

  publish(event: string, payload: any): void {
    const subs = this.subscribers.get(event) || [];
    // Call subscribers asynchronously to avoid blocking publisher
    for (const cb of subs) {
      try {
        // Use setImmediate-like via setTimeout 0 to decouple
        setTimeout(() => {
          try {
            cb(payload);
          } catch (err) {
            // Swallow errors to avoid breaking others
            // In a real system, we'd log this
          }
        }, 0);
      } catch {
        // ignore
      }
    }
  }

  subscribe(event: string, callback: EventCallback): void {
    const subs = this.subscribers.get(event) || [];
    subs.push(callback);
    this.subscribers.set(event, subs);
  }
}
