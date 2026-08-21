import { IEventBus } from "./types";

export class EventBus implements IEventBus {
  private subscribers: Map<string, Array<(payload: unknown) => void>> = new Map();

  publish(event: string, payload: unknown): void {
    const callbacks = this.subscribers.get(event) || [];
    // Dispatch synchronously in order of subscription
    for (const cb of callbacks) {
      try {
        cb(payload);
      } catch (err) {
        // Swallow to avoid one bad subscriber breaking others
        // In a real system, we'd log this
      }
    }
  }

  subscribe(event: string, callback: (payload: unknown) => void): void {
    const list = this.subscribers.get(event) || [];
    list.push(callback);
    this.subscribers.set(event, list);
  }
}

export default EventBus;
