type EventHandler = (payload: any) => void | Promise<void>;

export class EventBus {
  private subscribers: Map<string, Set<EventHandler>> = new Map();

  subscribe(eventName: string, handler: EventHandler) {
    if (!this.subscribers.has(eventName)) this.subscribers.set(eventName, new Set());
    this.subscribers.get(eventName)!.add(handler);
    return () => this.subscribers.get(eventName)!.delete(handler);
  }

  async publish(eventName: string, payload: any) {
    const handlers = this.subscribers.get(eventName);
    if (!handlers) return;
    for (const h of Array.from(handlers)) {
      try {
        await h(payload);
      } catch (err) {
        console.error(`Error handling event ${eventName}:`, err);
      }
    }
  }
}
