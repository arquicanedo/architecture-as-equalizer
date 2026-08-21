type Callback = (payload: any) => void;

export class EventBus {
  private subscribers: Map<string, Callback[]> = new Map();

  subscribe(eventName: string, cb: Callback) {
    const list = this.subscribers.get(eventName) || [];
    list.push(cb);
    this.subscribers.set(eventName, list);
    return () => {
      const cur = this.subscribers.get(eventName) || [];
      this.subscribers.set(
        eventName,
        cur.filter((c) => c !== cb)
      );
    };
  }

  publish(eventName: string, payload: any) {
    const list = this.subscribers.get(eventName) || [];
    for (const cb of list) {
      // Call safely
      try {
        cb(payload);
      } catch (err) {
        // swallow
        console.error('Event handler error for', eventName, err);
      }
    }
  }
}
