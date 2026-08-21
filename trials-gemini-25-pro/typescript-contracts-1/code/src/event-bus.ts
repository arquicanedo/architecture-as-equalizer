import { EventEmitter } from 'node:events';
import { IEventBus } from './types';

export class EventBus implements IEventBus {
  private emitter = new EventEmitter();

  public publish(event: string, payload: unknown): void {
    this.emitter.emit(event, payload);
  }

  public subscribe(event: string, callback: (payload: unknown) => void): void {
    this.emitter.on(event, callback);
  }
}
