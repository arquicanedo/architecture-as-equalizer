export type EventHandler = (payload: any) => void;

export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  on(eventName: string, handler: EventHandler) {
    if (!this.handlers.has(eventName)) this.handlers.set(eventName, []);
    this.handlers.get(eventName)!.push(handler);
  }

  emit(eventName: string, payload: any) {
    const handlers = this.handlers.get(eventName) || [];
    for (const h of handlers) {
      try {
        h(payload);
      } catch (err) {
        // swallow errors from handlers to avoid crashing emitter
        console.error('Event handler error for', eventName, err);
      }
    }
  }
}
