// ============================================================
// Event Bus Implementation
// ============================================================

export interface IEventBus {
  publish(event: string, payload: unknown): void;
  subscribe(event: string, callback: (payload: unknown) => void): void;
}

export class EventBus implements IEventBus {
  private subscribers: Map<string, Set<(payload: unknown) => void>> = new Map();

  publish(event: string, payload: unknown): void {
    const callbacks = this.subscribers.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(payload);
      }
    }
  }

  subscribe(event: string, callback: (payload: unknown) => void): void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event)!.add(callback);
  }
}
