type Callback = (payload: any) => void;

class EventBus {
  private subs: Map<string, Callback[]> = new Map();

  publish(event: string, payload: any): void {
    const cbs = this.subs.get(event);
    if (!cbs) return;
    // call subscribers asynchronously to avoid blocking
    for (const cb of cbs) {
      setImmediate(() => cb(payload));
    }
  }

  subscribe(event: string, callback: Callback): void {
    const arr = this.subs.get(event) || [];
    arr.push(callback);
    this.subs.set(event, arr);
  }
}

export const eventBus = new EventBus();
