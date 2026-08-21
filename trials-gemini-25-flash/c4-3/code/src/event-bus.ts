
type EventCallback = (payload: any) => void;

/**
 * In-memory publish/subscribe message broker.
 * Adheres to ADR-001: Event Bus over Direct Calls.
 */
export class EventBus {
    private subscribers: Map<string, EventCallback[]>;

    constructor() {
        this.subscribers = new Map();
    }

    /**
     * Publishes an event to all registered subscribers.
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
                    console.error(`Error processing event "${event}" by a subscriber:`, error);
                }
            });
        }
    }

    /**
     * Subscribes a callback function to an event.
     * @param event The name of the event to subscribe to.
     * @param callback The function to call when the event is published.
     */
    subscribe(event: string, callback: EventCallback): () => void {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        this.subscribers.get(event)!.push(callback);

        // Return an unsubscribe function
        return () => {
            const callbacks = this.subscribers.get(event);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index > -1) {
                    callbacks.splice(index, 1);
                }
            }
        };
    }
}
