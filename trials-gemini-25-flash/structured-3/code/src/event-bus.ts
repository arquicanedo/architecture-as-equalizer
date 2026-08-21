
type EventCallback = (payload: any) => void;

class EventBus {
    private subscribers: Map<string, EventCallback[]>;

    constructor() {
        this.subscribers = new Map();
    }

    /**
     * Publishes an event to all subscribed listeners.
     * @param event The name of the event to publish.
     * @param payload The data associated with the event.
     */
    publish(event: string, payload: any): void {
        const callbacks = this.subscribers.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(payload);
                } catch (error) {
                    console.error(`Error in event subscriber for event "${event}":`, error);
                }
            });
        }
    }

    /**
     * Subscribes a callback function to an event.
     * @param event The name of the event to subscribe to.
     * @param callback The function to call when the event is published.
     */
    subscribe(event: string, callback: EventCallback): void {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        this.subscribers.get(event)!.push(callback);
    }
}

export const eventBus = new EventBus();
