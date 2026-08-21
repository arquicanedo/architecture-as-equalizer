export type Callback = (payload: any) => void;

export class EventBus {
  private subs: Map<string, Set<Callback>> = new Map();

  subscribe(event: string, cb: Callback): void {
    if (!this.subs.has(event)) this.subs.set(event, new Set());
    this.subs.get(event)!.add(cb);
  }

  publish(event: string, payload: any): void {
    const set = this.subs.get(event);
    if (!set) return;
    for (const cb of Array.from(set)) {
      try {
        cb(payload);
      } catch (err) {
        // swallow errors to avoid breaking publisher
        // in real system we'd log
      }
    }
  }
}
