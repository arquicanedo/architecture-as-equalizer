export type EventCallback = (payload: any) => void;

export class EventBus {
  private subs: Map<string, Set<EventCallback>> = new Map();

  publish(event: string, payload: any): void {
    const set = this.subs.get(event);
    if (!set) return;
    // call subscribers asynchronously but not awaited
    for (const cb of Array.from(set)) {
      try {
        cb(payload);
      } catch (err) {
        // swallow errors to avoid crashing publisher
        // In a real app we might log
      }
    }
  }

  subscribe(event: string, callback: EventCallback): void {
    let set = this.subs.get(event);
    if (!set) {
      set = new Set();
      this.subs.set(event, set);
    }
    set.add(callback);
  }
}
