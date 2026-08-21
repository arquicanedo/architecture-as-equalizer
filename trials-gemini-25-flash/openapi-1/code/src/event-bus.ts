
type EventCallback = (payload: any) => void;

export class EventBus {
    private subscribers: Map<string, EventCallback[]>;

    constructor() {
        this.subscribers = new Map();
    }

    publish(event: string, payload: any): void {
        const callbacks = this.subscribers.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                // Execute callbacks asynchronously to prevent blocking the publisher
                // and to decouple services further.
                setImmediate(() => callback(payload));
            });
        }
    }

    subscribe(event: string, callback: EventCallback): void {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        this.subscribers.get(event)?.push(callback);
    }
}
