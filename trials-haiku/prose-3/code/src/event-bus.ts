/**
 * Event Bus - Simple publish/subscribe system for inter-service communication
 */

type EventHandler = (payload: any) => void;

export class EventBus {
  private subscribers: Map<string, EventHandler[]> = new Map();

  /**
   * Subscribe to an event by name
   */
  subscribe(eventName: string, handler: EventHandler): void {
    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, []);
    }
    this.subscribers.get(eventName)!.push(handler);
  }

  /**
   * Publish an event with a payload
   */
  publish(eventName: string, payload: any): void {
    const handlers = this.subscribers.get(eventName);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error handling event ${eventName}:`, error);
        }
      });
    }
  }
}

export const eventBus = new EventBus();
