type EventCallback = (payload: any) => void;

export class EventBus {
    private subscribers: Map<string, EventCallback[]> = new Map();

    public subscribe(event: string, callback: EventCallback): void {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        this.subscribers.get(event)?.push(callback);
    }

    public publish(event: string, payload: any): void {
        if (this.subscribers.has(event)) {
            this.subscribers.get(event)?.forEach(callback => {
                // Run callbacks asynchronously to prevent blocking the publisher
                // and to adhere to the decoupled nature of event buses.
                setImmediate(() => callback(payload));
            });
        }
    }
}
