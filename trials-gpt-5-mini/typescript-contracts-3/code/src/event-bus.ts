import { EventEmitter } from "events";
import { IEventBus } from "./types";

export class EventBus implements IEventBus {
  private emitter = new EventEmitter();

  publish(event: string, payload: unknown): void {
    this.emitter.emit(event, payload);
  }

  subscribe(event: string, callback: (payload: unknown) => void): void {
    this.emitter.on(event, callback);
  }
}
