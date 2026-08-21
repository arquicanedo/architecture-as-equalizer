type Callback = (payload: any) => void;

class EventBus {
    private subscribers: Map<string, Callback[]> = new Map();

    public subscribe(event: string, callback: Callback): void {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        this.subscribers.get(event)!.push(callback);
    }

    public publish(event: string, payload: any): void {
        if (this.subscribers.has(event)) {
            this.subscribers.get(event)!.forEach(callback => {
                try {
                    callback(payload);
                } catch (error) {
                    console.error(`Error in event bus subscriber for event "${event}":`, error);
                }
            });
        }
    }
}

export const eventBus = new EventBus();
