export type EventCallback = (payload: any) => void;

export class EventBus {
  private subs: Map<string, Set<EventCallback>> = new Map();

  publish(event: string, payload: any): void {
    const set = this.subs.get(event);
    if (!set) return;
    // Call subscribers synchronously
    for (const cb of Array.from(set)) {
      try {
        cb(payload);
      } catch (err) {
        // swallow subscriber errors to avoid breaking publisher
        // In production we might log this
      }
    }
  }

  subscribe(event: string, callback: EventCallback): void {
    if (!this.subs.has(event)) this.subs.set(event, new Set());
    this.subs.get(event)!.add(callback);
  }

  unsubscribe(event: string, callback: EventCallback): void {
    const set = this.subs.get(event);
    if (!set) return;
    set.delete(callback);
    if (set.size === 0) this.subs.delete(event);
  }
}
