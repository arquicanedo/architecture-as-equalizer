import { IEventBus } from './types';

type EventCallback = (payload: unknown) => void;

export class EventBus implements IEventBus {
  private subscribers: Map<string, EventCallback[]>;

  constructor() {
    this.subscribers = new Map();
  }

  publish(event: string, payload: unknown): void {
    const callbacks = this.subscribers.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error processing event ${event}:`, error);
        }
      });
    }
  }

  subscribe(event: string, callback: EventCallback): void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event)?.push(callback);
  }
}
