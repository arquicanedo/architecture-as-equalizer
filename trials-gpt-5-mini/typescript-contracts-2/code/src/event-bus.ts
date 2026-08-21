import { IEventBus } from "./types";

export class EventBus implements IEventBus {
  private handlers: Map<string, Array<(payload: unknown) => void>> = new Map();

  publish(event: string, payload: unknown): void {
    const list = this.handlers.get(event) || [];
    for (const h of list) {
      try {
        h(payload);
      } catch (e) {
        // swallow to avoid breaking bus
        // eslint-disable-next-line no-console
        console.error("Event handler error", e);
      }
    }
  }

  subscribe(event: string, callback: (payload: unknown) => void): void {
    const list = this.handlers.get(event);
    if (list) {
      list.push(callback);
    } else {
      this.handlers.set(event, [callback]);
    }
  }
}
