
interface EventBusEvents {
  [key: string]: any[];
}

class EventBus {
  private subscribers: Map<string, ((payload: any) => void)[]> = new Map();

  publish<T>(event: string, payload: T): void {
    const handlers = this.subscribers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error handling event "${event}":`, error);
        }
      });
    }
  }

  subscribe<T>(event: string, callback: (payload: T) => void): void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event)?.push(callback as (payload: any) => void);
  }

  unsubscribe<T>(event: string, callback: (payload: T) => void): void {
    const handlers = this.subscribers.get(event);
    if (handlers) {
      this.subscribers.set(event, handlers.filter(handler => handler !== callback));
    }
  }
}

export const eventBus = new EventBus();
