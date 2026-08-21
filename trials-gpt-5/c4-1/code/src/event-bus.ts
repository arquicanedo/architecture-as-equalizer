export type EventCallback<T = any> = (payload: T) => void;

export class EventBus {
  private subscribers: Map<string, EventCallback<any>[]> = new Map();

  publish<T = any>(event: string, payload: T): void {
    const subs = this.subscribers.get(event) || [];
    // Call subscribers synchronously
    for (const cb of subs) {
      try {
        cb(payload);
      } catch (err) {
        // Swallow to avoid breaking publisher
        // In a real system, we'd log this
      }
    }
  }

  subscribe<T = any>(event: string, callback: EventCallback<T>): void {
    const subs = this.subscribers.get(event) || [];
    subs.push(callback as EventCallback<any>);
    this.subscribers.set(event, subs);
  }
}
