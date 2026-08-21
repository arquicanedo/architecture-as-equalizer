import { EventEmitter } from 'events';
import { TaskAssignedEvent, TaskStatusChangedEvent, CommentAddedEvent } from './types';

// Define specific event types for better type safety
export interface EventTypes {
    'task.assigned': TaskAssignedEvent;
    'task.statusChanged': TaskStatusChangedEvent;
    'comment.added': CommentAddedEvent;
    [key: string]: any; // Allow for other events with any payload
}

class EventBus {
    private emitter: EventEmitter;

    constructor() {
        this.emitter = new EventEmitter();
    }

    /**
     * Publishes an event to the bus.
     * @param event The name of the event.
     * @param payload The data associated with the event.
     */
    publish<K extends keyof EventTypes>(event: K, payload: EventTypes[K]): void;
    publish(event: string, payload: any): void {
        this.emitter.emit(event, payload);
    }

    /**
     * Subscribes a callback function to an event.
     * @param event The name of the event.
     * @param callback The function to call when the event is published.
     */
    subscribe<K extends keyof EventTypes>(event: K, callback: (payload: EventTypes[K]) => void): void;
    subscribe(event: string, callback: (payload: any) => void): void {
        this.emitter.on(event, callback);
    }
}

export const eventBus = new EventBus();
