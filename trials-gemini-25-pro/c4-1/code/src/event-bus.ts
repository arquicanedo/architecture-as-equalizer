type Listener = (payload: any) => void;

export class EventBus {
    private listeners: Map<string, Listener[]> = new Map();

    subscribe(event: string, callback: Listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    publish(event: string, payload: any) {
        if (this.listeners.has(event)) {
            this.listeners.get(event)!.forEach(callback => {
                try {
                    callback(payload);
                } catch (e) {
                    console.error(`Error in event bus callback for event ${event}:`, e);
                }
            });
        }
    }
}

export const eventBus = new EventBus();
