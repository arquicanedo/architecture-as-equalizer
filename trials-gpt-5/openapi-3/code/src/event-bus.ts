export type EventCallback = (payload: any) => void;

export class EventBus {
  private listeners: Map<string, EventCallback[]> = new Map();

  publish(event: string, payload: any): void {
    const callbacks = this.listeners.get(event) || [];
    // Callbacks are called synchronously for simplicity
    for (const cb of callbacks) {
      try {
        cb(payload);
      } catch (err) {
        // Swallow to avoid crashing publisher
        // In real system, log this
      }
    }
  }

  subscribe(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }
}
