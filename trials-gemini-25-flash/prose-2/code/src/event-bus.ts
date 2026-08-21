
type EventCallback = (payload: any) => void;

export class EventBus {
  private subscribers: Map<string, EventCallback[]> = new Map();

  publish<T>(eventName: string, payload: T): void {
    const callbacks = this.subscribers.get(eventName);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in event subscriber for ${eventName}:`, error);
        }
      });
    }
  }

  subscribe(eventName: string, callback: EventCallback): void {
    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, []);
    }
    this.subscribers.get(eventName)?.push(callback);
  }

  unsubscribe(eventName: string, callback: EventCallback): void {
    const callbacks = this.subscribers.get(eventName);
    if (callbacks) {
      this.subscribers.set(eventName, callbacks.filter(cb => cb !== callback));
    }
  }
}
