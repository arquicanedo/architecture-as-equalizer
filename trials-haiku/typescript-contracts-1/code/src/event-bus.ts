// Event Bus Contract
export interface IEventBus {
  publish(event: string, payload: unknown): void;
  subscribe(event: string, callback: (payload: unknown) => void): void;
}

// Event payloads
export interface TaskAssignedPayload {
  taskId: string;
  taskTitle: string;
  assigneeId: string;
}

export interface TaskStatusChangedPayload {
  taskId: string;
  taskTitle: string;
  assigneeId: string | null;
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
}

export interface CommentAddedPayload {
  commentId: string;
  taskId: string;
  taskTitle: string;
  authorId: string;
  authorName: string;
}

export type TaskStatus = "todo" | "in-progress" | "done";

// Event Bus Implementation
export class EventBus implements IEventBus {
  private subscribers: Map<string, ((payload: unknown) => void)[]> = new Map();

  publish(event: string, payload: unknown): void {
    const callbacks = this.subscribers.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in subscriber for event "${event}":`, error);
        }
      });
    }
  }

  subscribe(event: string, callback: (payload: unknown) => void): void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event)!.push(callback);
  }
}
