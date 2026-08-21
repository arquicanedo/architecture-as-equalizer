// ============================================================
// Event Bus — in-memory publish/subscribe.
// Services never import each other; they communicate solely
// through events published here.
// ============================================================

type EventCallback = (payload: unknown) => void;

class EventBus {
  private readonly listeners = new Map<string, EventCallback[]>();

  /** Register a handler for a named event. */
  subscribe(event: string, callback: EventCallback): void {
    const existing = this.listeners.get(event) ?? [];
    existing.push(callback);
    this.listeners.set(event, existing);
  }

  /** Dispatch an event to every registered handler synchronously. */
  publish(event: string, payload: unknown): void {
    const handlers = this.listeners.get(event) ?? [];
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        // Isolate subscriber errors so a failing handler doesn't
        // prevent other handlers from running.
        console.error(`[EventBus] Handler error for event "${event}":`, err);
      }
    }
  }
}

// Singleton shared across the whole process.
export const eventBus = new EventBus();

// ---- Well-known event names (avoids magic strings) ----------

export const Events = {
  TASK_ASSIGNED: 'task.assigned',
  TASK_STATUS_CHANGED: 'task.statusChanged',
  COMMENT_ADDED: 'comment.added',
} as const;

// ---- Typed payload interfaces --------------------------------

export interface TaskAssignedPayload {
  taskId: string;
  taskTitle: string;
  assigneeId: string;
}

export interface TaskStatusChangedPayload {
  taskId: string;
  taskTitle: string;
  assigneeId: string | null;
  oldStatus: string;
  newStatus: string;
}

export interface CommentAddedPayload {
  commentId: string;
  taskId: string;
  taskTitle: string;
  authorId: string;
  authorName: string;
}
