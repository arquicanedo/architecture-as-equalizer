type EventCallback = (payload: any) => void;

export class EventBus {
    private subscribers: Map<string, EventCallback[]> = new Map();

    public publish(event: string, payload: any): void {
        const callbacks = this.subscribers.get(event);
        if (callbacks) {
            for (const callback of callbacks) {
                try {
                    callback(payload);
                } catch (error) {
                    console.error(`Error processing event '${event}':`, error);
                }
            }
        }
    }

    public subscribe(event: string, callback: EventCallback): void {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        this.subscribers.get(event)?.push(callback);
    }

    public unsubscribe(event: string, callback: EventCallback): void {
        const callbacks = this.subscribers.get(event);
        if (callbacks) {
            this.subscribers.set(event, callbacks.filter(cb => cb !== callback));
        }
    }
}
