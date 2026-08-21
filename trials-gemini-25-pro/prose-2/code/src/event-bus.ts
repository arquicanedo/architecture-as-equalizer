type Listener = (payload: any) => void;

export class EventBus {
    private listeners: { [eventName: string]: Listener[] } = {};

    subscribe(eventName: string, listener: Listener) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(listener);
    }

    publish(eventName: string, payload: any) {
        if (this.listeners[eventName]) {
            this.listeners[eventName].forEach(listener => {
                try {
                    listener(payload);
                } catch (e) {
                    console.error(`Error in event listener for ${eventName}:`, e);
                }
            });
        }
    }
}

export const eventBus = new EventBus();
