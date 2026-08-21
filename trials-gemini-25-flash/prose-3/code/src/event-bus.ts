import { Event, EventName, EventHandler } from './types';

export class EventBus {
  private subscribers: Map<EventName, EventHandler[]> = new Map();

  public publish(event: Event): void {
    const handlers = this.subscribers.get(event.name);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error handling event '${event.name}':`, error);
        }
      });
    }
  }

  public subscribe(eventName: EventName, handler: EventHandler): () => void {
    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, []);
    }
    this.subscribers.get(eventName)!.push(handler);

    // Return an unsubscribe function
    return () => {
      const handlers = this.subscribers.get(eventName);
      if (handlers) {
        this.subscribers.set(eventName, handlers.filter(h => h !== handler));
      }
    };
  }
}
