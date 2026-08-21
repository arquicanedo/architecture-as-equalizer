import { IEventBus } from "./types";

export class EventBus implements IEventBus {
  private subscribers: Map<string, Array<(payload: unknown) => void>> = new Map();

  publish(event: string, payload: unknown): void {
    const subs = this.subscribers.get(event);
    if (subs) {
      for (const cb of subs) {
        try {
          cb(payload);
        } catch (err) {
          // Swallow subscriber errors to not break publisher flow
          // In real system, we'd log this
        }
      }
    }
  }

  subscribe(event: string, callback: (payload: unknown) => void): void {
    const subs = this.subscribers.get(event) ?? [];
    subs.push(callback);
    this.subscribers.set(event, subs);
  }
}
