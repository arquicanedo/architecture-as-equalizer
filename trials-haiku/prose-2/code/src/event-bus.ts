/**
 * Simple in-memory Event Bus for publish/subscribe communication between services
 */

export interface EventPayload {
  [key: string]: unknown;
}

export type EventCallback = (payload: EventPayload) => void;

export class EventBus {
  private subscribers: Map<string, EventCallback[]> = new Map();

  /**
   * Subscribe to an event by name
   */
  subscribe(eventName: string, callback: EventCallback): void {
    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, []);
    }
    this.subscribers.get(eventName)!.push(callback);
  }

  /**
   * Publish an event to all subscribers
   */
  publish(eventName: string, payload: EventPayload): void {
    const callbacks = this.subscribers.get(eventName);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in event handler for ${eventName}:`, error);
        }
      });
    }
  }
}

export const eventBus = new EventBus();
