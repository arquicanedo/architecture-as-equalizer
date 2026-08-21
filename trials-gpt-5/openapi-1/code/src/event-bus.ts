export type EventCallback = (payload: any) => void;

export class EventBus {
  private subscribers: Map<string, EventCallback[]> = new Map();

  publish(event: string, payload: any): void {
    const subs = this.subscribers.get(event) || [];
    for (const cb of subs) {
      try {
        cb(payload);
      } catch (err) {
        // Swallow subscriber errors to avoid breaking publisher
        // In a real system we might log this
      }
    }
  }

  subscribe(event: string, callback: EventCallback): void {
    const subs = this.subscribers.get(event) || [];
    subs.push(callback);
    this.subscribers.set(event, subs);
  }
}
