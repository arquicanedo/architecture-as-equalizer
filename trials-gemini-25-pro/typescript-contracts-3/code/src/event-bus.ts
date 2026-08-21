import { EventEmitter } from 'events';
import { IEventBus } from './types';

class EventBus extends EventEmitter implements IEventBus {
  publish(event: string, payload: unknown): void {
    this.emit(event, payload);
  }

  subscribe(event: string, callback: (payload: unknown) => void): void {
    this.on(event, callback);
  }
}

export const eventBus = new EventBus();
