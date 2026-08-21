// ============================================================
// Event Bus — IEventBus implementation
// ============================================================

export type TaskStatus = "todo" | "in-progress" | "done";

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
  /** The current assignee of the task at comment time (may be null) */
  assigneeId: string | null;
}

interface IEventBus {
  publish(event: string, payload: unknown): void;
  subscribe(event: string, callback: (payload: unknown) => void): void;
}

class EventBus implements IEventBus {
  private subscribers: Map<string, Array<(payload: unknown) => void>> = new Map();

  publish(event: string, payload: unknown): void {
    const handlers = this.subscribers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(payload);
      }
    }
  }

  subscribe(event: string, callback: (payload: unknown) => void): void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event)!.push(callback);
  }
}

export const eventBus = new EventBus();
