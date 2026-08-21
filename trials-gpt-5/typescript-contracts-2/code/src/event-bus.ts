import { IEventBus } from "./types";

export class EventBus implements IEventBus {
  private listeners: Map<string, Set<(payload: unknown) => void>> = new Map();

  publish(event: string, payload: unknown): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const cb of set) {
      try {
        cb(payload);
      } catch (err) {
        // Swallow errors to avoid crashing publisher; log to console
        // In a real system, we would use proper logging
        console.error(`EventBus listener error for event '${event}':`, err);
      }
    }
  }

  subscribe(event: string, callback: (payload: unknown) => void): void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(callback);
  }
}
