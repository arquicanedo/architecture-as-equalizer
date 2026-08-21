type Callback = (payload: any) => void;

class EventBus {
    private subscribers: Map<string, Callback[]> = new Map();

    public publish(event: string, payload: any): void {
        const callbacks = this.subscribers.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(payload);
                } catch (error) {
                    console.error(`Error in event bus callback for event ${event}:`, error);
                }
            });
        }
    }

    public subscribe(event: string, callback: Callback): void {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        this.subscribers.get(event)!.push(callback);
    }
}

export const eventBus = new EventBus();
