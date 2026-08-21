import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: number;
}

export class NotificationService {
  private notifications: Map<string, Notification> = new Map();

  constructor(private bus: EventBus) {
    // Subscribe to events
    this.bus.subscribe('task.assigned', (payload: any) => {
      const { taskId, taskTitle, assigneeId } = payload || {};
      if (!assigneeId) return;
      this.create({ userId: assigneeId, message: `Task assigned: ${taskTitle || taskId}` });
    });

    this.bus.subscribe('task.statusChanged', (payload: any) => {
      const { taskId, taskTitle, assigneeId, oldStatus, newStatus } = payload || {};
      if (!assigneeId) return;
      this.create({ userId: assigneeId, message: `Task status changed: ${taskTitle || taskId} ${oldStatus} -> ${newStatus}` });
    });

    this.bus.subscribe('comment.added', (payload: any) => {
      const { taskId, taskTitle, authorName } = payload || {};
      // In a decoupled system, we need the assigneeId to notify, but spec says notify task assignee
      // We'll assume router passes taskTitle and that NotificationService cannot query TaskService.
      // Without assigneeId in event, we can't notify specific user. However, spec: comment.added should notify task assignee.
      // Adjust: expect event to include assigneeId in future; for now, ignore if not provided.
      const assigneeId = (payload && payload.assigneeId) as string | undefined;
      if (!assigneeId) return;
      this.create({ userId: assigneeId, message: `New comment on ${taskTitle || taskId} by ${authorName || 'someone'}` });
    });
  }

  private create(data: { userId: string; message: string }): Notification {
    const id = randomUUID();
    const notif: Notification = { id, userId: data.userId, message: data.message, read: false, createdAt: Date.now() };
    this.notifications.set(id, notif);
    return notif;
  }

  getByUser(userId: string): Notification[] {
    return Array.from(this.notifications.values()).filter((n) => n.userId === userId);
  }

  markAsRead(id: string): Notification | undefined {
    const n = this.notifications.get(id);
    if (!n) return undefined;
    n.read = true;
    this.notifications.set(id, n);
    return n;
  }
}
