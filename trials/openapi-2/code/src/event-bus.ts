/**
 * In-memory publish/subscribe Event Bus for inter-service communication.
 * Services MUST NOT call each other directly — all cross-service communication
 * goes through this bus.
 */

type EventCallback = (payload: unknown) => void;

class EventBus {
  private subscribers: Map<string, EventCallback[]> = new Map();

  /**
   * Subscribe to an event by name. Multiple subscribers per event are supported.
   */
  subscribe(event: string, callback: EventCallback): void {
    const existing = this.subscribers.get(event) ?? [];
    this.subscribers.set(event, [...existing, callback]);
  }

  /**
   * Publish an event, synchronously invoking all registered subscribers.
   */
  publish(event: string, payload: unknown): void {
    const callbacks = this.subscribers.get(event) ?? [];
    for (const cb of callbacks) {
      try {
        cb(payload);
      } catch (err) {
        console.error(`[EventBus] Error in subscriber for event "${event}":`, err);
      }
    }
  }
}

// Singleton instance shared across all services
export const eventBus = new EventBus();

// ── Well-known event names ──────────────────────────────────────────────────

export const EVENT_TASK_ASSIGNED = "task.assigned";
export const EVENT_TASK_STATUS_CHANGED = "task.statusChanged";
export const EVENT_COMMENT_ADDED = "comment.added";

// ── Typed payloads ──────────────────────────────────────────────────────────

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
