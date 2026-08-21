type Callback = (payload: any) => void;

class EventBus {
  private listeners: Map<string, Callback[]> = new Map();

  public subscribe(event: string, callback: Callback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public publish(event: string, payload: any): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        try {
            callback(payload);
        } catch (e) {
            console.error(`Error in event bus callback for event ${event}:`, e);
        }
      });
    }
  }
}

export const eventBus = new EventBus();
