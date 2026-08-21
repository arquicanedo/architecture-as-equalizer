type Callback = (payload: any) => void;

export class EventBus {
    private readonly subscribers: Map<string, Callback[]> = new Map();

    public publish(event: string, payload: any): void {
        const eventSubscribers = this.subscribers.get(event);
        if (eventSubscribers) {
            eventSubscribers.forEach(callback => {
                try {
                    callback(payload);
                } catch (error) {
                    console.error(`Error in event bus subscriber for event "${event}":`, error);
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
