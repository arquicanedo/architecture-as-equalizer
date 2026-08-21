
type EventCallback = (payload: any) => void;

class EventBus {
    private subscribers: Map<string, EventCallback[]>;

    constructor() {
        this.subscribers = new Map();
    }

    publish(event: string, payload: any): void {
        const callbacks = this.subscribers.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(payload));
        }
    }

    subscribe(event: string, callback: EventCallback): void {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        this.subscribers.get(event)?.push(callback);
    }
}

export const eventBus = new EventBus();
