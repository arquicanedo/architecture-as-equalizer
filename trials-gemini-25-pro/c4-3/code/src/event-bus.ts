type Callback = (payload: any) => void;

class EventBus {
    private subscribers: { [event: string]: Callback[] } = {};

    public publish(event: string, payload: any): void {
        const eventSubscribers = this.subscribers[event];
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
        if (!this.subscribers[event]) {
            this.subscribers[event] = [];
        }
        this.subscribers[event].push(callback);
    }
}

export const eventBus = new EventBus();
