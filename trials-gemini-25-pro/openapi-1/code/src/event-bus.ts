type Callback = (payload: any) => void;

class EventBus {
  private readonly listeners: Map<string, Callback[]> = new Map();

  public publish(event: string, payload: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => {
        try {
          callback(payload);
        } catch (e) {
          console.error(`Error in event bus callback for event ${event}:`, e);
        }
      });
    }
  }

  public subscribe(event: string, callback: Callback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }
}

// Singleton instance
export const eventBus = new EventBus();
