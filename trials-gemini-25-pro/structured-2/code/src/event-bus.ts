type Callback = (payload: any) => void;

export class EventBus {
    private subscriptions: Map<string, Callback[]> = new Map();

    public publish(event: string, payload: any): void {
        const subscribers = this.subscriptions.get(event);
        if (subscribers) {
            subscribers.forEach(callback => {
                try {
                    callback(payload);
                } catch (error) {
                    console.error(`Error in event bus callback for event "${event}":`, error);
                }
            });
        }
    }

    public subscribe(event: string, callback: Callback): void {
        if (!this.subscriptions.has(event)) {
            this.subscriptions.set(event, []);
        }
        this.subscriptions.get(event)!.push(callback);
    }
}

export const eventBus = new EventBus();
