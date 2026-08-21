import { EventCallback, EventPayload } from './types';

export class EventBus {
  private listeners: Map<string, Array<EventCallback<any>>> = new Map();

  public subscribe<T extends EventPayload>(eventName: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName)!.push(callback);

    // Return an unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(eventName);
      if (eventListeners) {
        const index = eventListeners.indexOf(callback as EventCallback<any>);
        if (index > -1) {
          eventListeners.splice(index, 1);
        }
      }
    };
  }

  public publish<T extends EventPayload>(eventName: string, payload: T): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in event listener for ${eventName}:`, error);
        }
      });
    }
  }
}
