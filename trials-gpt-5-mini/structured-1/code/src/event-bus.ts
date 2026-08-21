export type EventCallback = (payload: any) => void;

export class EventBus {
  private subscribers: Map<string, Set<EventCallback>> = new Map();

  publish(event: string, payload: any): void {
    const subs = this.subscribers.get(event);
    if (!subs) return;
    for (const cb of Array.from(subs)) {
      try {
        cb(payload);
      } catch (e) {
        // swallow subscriber errors to avoid breaking publisher
        // console.error('Event handler error', e);
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
