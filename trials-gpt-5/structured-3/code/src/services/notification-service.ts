import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: number; // epoch ms
}

export class NotificationService {
  private store: Map<string, Notification> = new Map();

  constructor(private bus: EventBus, private providers: { getTaskAssigneeId: (taskId: string) => string | undefined }) {
    // Subscribe to events
    bus.subscribe('task.assigned', (payload: any) => {
      const { taskId, taskTitle, assigneeId } = payload || {};
      if (!assigneeId) return;
      const message = `Task assigned: "${taskTitle || taskId}"`;
      this.createNotification(assigneeId, message);
    });

    bus.subscribe('task.statusChanged', (payload: any) => {
      const { taskId, taskTitle, assigneeId, oldStatus, newStatus } = payload || {};
      if (!assigneeId) return;
      const message = `Task status changed: "${taskTitle || taskId}" ${oldStatus} -> ${newStatus}`;
      this.createNotification(assigneeId, message);
    });

    bus.subscribe('comment.added', (payload: any) => {
      const { taskId, taskTitle, authorName } = payload || {};
      const assigneeId = this.providers.getTaskAssigneeId(taskId);
      if (!assigneeId) return;
      const message = `New comment on task "${taskTitle || taskId}" by ${authorName || 'someone'}`;
      this.createNotification(assigneeId, message);
    });
  }

  private createNotification(userId: string, message: string): Notification {
    const notif: Notification = {
      id: randomUUID(),
      userId,
      message,
      read: false,
      createdAt: Date.now(),
    };
    this.store.set(notif.id, notif);
    return notif;
  }

  getByUser(userId: string): Notification[] {
    return Array.from(this.store.values()).filter((n) => n.userId === userId);
  }

  markAsRead(id: string): Notification | undefined {
    const n = this.store.get(id);
    if (!n) return undefined;
    n.read = true;
    return n;
  }
}
