export type EventHandler<T = any> = (payload: T) => void;

export class EventBus {
  private subscribers: Map<string, Set<EventHandler>> = new Map();

  subscribe<T = any>(eventName: string, handler: EventHandler<T>): () => void {
    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, new Set());
    }
    const set = this.subscribers.get(eventName)!;
    set.add(handler as EventHandler);
    return () => {
      set.delete(handler as EventHandler);
    };
  }

  publish<T = any>(eventName: string, payload: T): void {
    const set = this.subscribers.get(eventName);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(payload);
      } catch (err) {
        // Swallow handler errors to avoid breaking the bus
        console.error(`Error in handler for event '${eventName}':`, err);
      }
    }
  }
}

export type TaskStatus = 'todo' | 'in-progress' | 'done';

// Event payload types (for convenience across services)
export interface TaskAssignedEvent {
  taskId: string;
  assigneeId: string;
  projectId: string;
  title: string;
}

export interface TaskStatusChangedEvent {
  taskId: string;
  from: TaskStatus;
  to: TaskStatus;
  assigneeId?: string;
  projectId: string;
  title: string;
}

export interface TaskDeletedEvent {
  taskId: string;
  assigneeId?: string;
  projectId: string;
  title: string;
}

export interface TaskCreatedEvent {
  taskId: string;
  projectId: string;
  assigneeId?: string;
  title: string;
}

export interface CommentAddedEvent {
  commentId: string;
  taskId: string;
  authorId: string;
  text: string;
}

export interface CommentAddedEnrichedEvent extends CommentAddedEvent {
  taskAssigneeId?: string;
}
