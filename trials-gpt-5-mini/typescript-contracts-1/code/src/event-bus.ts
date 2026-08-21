import { IEventBus } from "./types";

type Callback = (payload: unknown) => void;

export class EventBus implements IEventBus {
  private handlers: Map<string, Callback[]> = new Map();

  publish(event: string, payload: unknown): void {
    const h = this.handlers.get(event) || [];
    // call synchronously
    for (const cb of h) {
      try {
        cb(payload);
      } catch (err) {
        // swallow errors to not affect publisher
        // console.error("Event handler error", err);
      }
    }
  }

  subscribe(event: string, callback: Callback): void {
    const arr = this.handlers.get(event) || [];
    arr.push(callback);
    this.handlers.set(event, arr);
  }
}
