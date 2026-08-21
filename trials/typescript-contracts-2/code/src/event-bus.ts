import { IEventBus } from "./types.js";

export class EventBus implements IEventBus {
  private subscribers: Map<string, Array<(payload: unknown) => void>> = new Map();

  publish(event: string, payload: unknown): void {
    const handlers = this.subscribers.get(event);
    if (!handlers || handlers.length === 0) {
      return;
    }
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] Error in handler for event "${event}":`, err);
      }
    }
  }

  subscribe(event: string, callback: (payload: unknown) => void): void {
    const existing = this.subscribers.get(event);
    if (existing) {
      existing.push(callback);
    } else {
      this.subscribers.set(event, [callback]);
    }
  }
}
