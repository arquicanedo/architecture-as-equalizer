export type EventHandler = (payload: any) => void;

export class EventBus {
  private listeners: Map<string, Set<EventHandler>> = new Map();

  on(eventName: string, handler: EventHandler): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    const set = this.listeners.get(eventName)!;
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  }

  emit(eventName: string, payload: any): void {
    const set = this.listeners.get(eventName);
    if (!set) return;
    for (const handler of Array.from(set)) {
      try {
        handler(payload);
      } catch (err) {
        // Do not crash the bus if handlers throw
        // In a real system, we might log this
      }
    }
  }
}
