export type EventHandler = (payload: any) => void;

export class EventBus {
  private subscribers: Map<string, Set<EventHandler>> = new Map();

  subscribe(eventName: string, handler: EventHandler): () => void {
    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, new Set());
    }
    const set = this.subscribers.get(eventName)!;
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  }

  publish(eventName: string, payload: any): void {
    const handlers = this.subscribers.get(eventName);
    if (!handlers) return;
    // Call handlers in try/catch to avoid one failing handler breaking others
    for (const h of Array.from(handlers)) {
      try {
        h(payload);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Error handling event ${eventName}:`, err);
      }
    }
  }
}
