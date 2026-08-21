import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  timestamp: number;
}

export class NotificationService {
  private notifications: Map<string, Notification> = new Map();

  constructor(private bus: EventBus) {
    // Subscriptions
    this.bus.subscribe('task.assigned', ({ taskId, assignee }: { taskId: string; assignee: string }) => {
      this.create(assignee, `You have been assigned to task ${taskId}`);
    });

    this.bus.subscribe('task.statusChanged', ({ taskId, status, assignee }: { taskId: string; status: string; assignee?: string }) => {
      if (assignee) {
        this.create(assignee, `Task ${taskId} status changed to ${status}`);
      }
    });

    this.bus.subscribe('comment.added', ({ comment }: { comment: { taskId: string; authorId: string; body: string } }) => {
      // We don't know task assignee here without calling TaskService. Instead, publish a secondary event
      // that someone else (like the API layer) could enrich. For simplicity in this in-memory system,
      // we also listen for an enriched event comment.added.enriched
      this.bus.publish('comment.added.needsAssignee', { taskId: comment.taskId, authorId: comment.authorId, body: comment.body });
    });

    this.bus.subscribe('comment.added.enriched', ({ taskId, assignee, authorId }: { taskId: string; assignee?: string; authorId: string }) => {
      if (assignee) {
        this.create(assignee, `New comment on task ${taskId} by user ${authorId}`);
      }
    });
  }

  private create(userId: string, message: string): Notification {
    const n: Notification = { id: randomUUID(), userId, message, read: false, timestamp: Date.now() };
    this.notifications.set(n.id, n);
    return n;
  }

  list(filter?: { userId?: string }): Notification[] {
    let out = Array.from(this.notifications.values());
    if (filter?.userId) {
      out = out.filter(n => n.userId === filter.userId);
    }
    return out.sort((a, b) => a.timestamp - b.timestamp);
  }

  get(id: string): Notification | undefined {
    return this.notifications.get(id);
  }

  markRead(id: string): Notification | undefined {
    const n = this.notifications.get(id);
    if (!n) return undefined;
    n.read = true;
    this.notifications.set(id, n);
    return n;
  }
}
