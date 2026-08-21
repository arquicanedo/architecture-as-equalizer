import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  timestamp: number; // epoch ms
}

export class NotificationService {
  private notifications: Map<string, Notification> = new Map();

  constructor(private bus: EventBus) {
    // Subscriptions
    bus.on('task.assigned', ({ taskId, assignee }: { taskId: string; assignee: string }) => {
      this.create(assignee, `You have been assigned to task ${taskId}`);
    });
    bus.on('task.statusChanged', ({ taskId, assignee, status }: { taskId: string; assignee?: string; status: string }) => {
      if (assignee) this.create(assignee, `Task ${taskId} status changed to ${status}`);
    });
    bus.on('comment.added', ({ taskId, authorId }: { taskId: string; authorId: string }) => {
      // In a decoupled design, we don't know the assignee here. We rely on router to include such info in payload
      // But per spec, Comment Service publishes only comment.added with taskId and authorId. We'll notify author only if desired
      // Alternatively, we keep a lightweight subscription for task.assigned to map current assignees for notifications.
      // Simpler: rely on router to publish comment.added.enriched with assignee when it has that context.
    });
    // We'll also listen for enriched comment events to notify assignee
    bus.on('comment.added.enriched', ({ taskId, assignee, authorId }: { taskId: string; assignee?: string; authorId: string }) => {
      if (assignee) this.create(assignee, `New comment on your task ${taskId} by user ${authorId}`);
    });
  }

  private create(userId: string, message: string): Notification {
    const id = randomUUID();
    const notif: Notification = { id, userId, message, read: false, timestamp: Date.now() };
    this.notifications.set(id, notif);
    return notif;
  }

  list(filter?: { userId?: string }): Notification[] {
    let list = Array.from(this.notifications.values());
    if (filter?.userId) list = list.filter((n) => n.userId === filter.userId);
    return list.sort((a, b) => a.timestamp - b.timestamp);
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
