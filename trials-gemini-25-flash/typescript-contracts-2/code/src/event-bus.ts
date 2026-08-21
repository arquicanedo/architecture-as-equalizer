import { IEventBus } from './types';

type EventCallback = (payload: unknown) => void;

export class EventBus implements IEventBus {
  private subscribers = new Map<string, EventCallback[]>();

  publish(event: string, payload: unknown): void {
    const callbacks = this.subscribers.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error processing event '${event}':`, error);
        }
      });
    }
  }

  subscribe(event: string, callback: EventCallback): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event)!.push(callback);

    // Return an unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }
}
