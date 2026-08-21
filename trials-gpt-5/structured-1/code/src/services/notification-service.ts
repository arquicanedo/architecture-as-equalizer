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

  constructor(
    private bus: EventBus,
    private getTaskAssignee: (taskId: string) => string | undefined,
  ) {
    this.subscribeToEvents();
  }

  private subscribeToEvents() {
    this.bus.subscribe('task.assigned', (payload: any) => {
      const { taskId, taskTitle, assigneeId } = payload || {};
      if (!assigneeId) return;
      const message = `Task assigned: "${taskTitle || taskId}" assigned to you.`;
      this.createNotification(assigneeId, message);
    });

    this.bus.subscribe('task.statusChanged', (payload: any) => {
      const { taskId, taskTitle, assigneeId, oldStatus, newStatus } = payload || {};
      if (!assigneeId) return;
      const message = `Task status changed: "${taskTitle || taskId}" ${oldStatus} -> ${newStatus}.`;
      this.createNotification(assigneeId, message);
    });

    this.bus.subscribe('comment.added', (payload: any) => {
      const { taskId, taskTitle, authorId, authorName } = payload || {};
      const assigneeId = this.getTaskAssignee(taskId);
      if (!assigneeId) return;
      const message = `New comment on "${taskTitle || taskId}" from ${authorName || authorId}.`;
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
    this.notifications.set(notif.id, notif);
    return notif;
  }

  getByUser(userId: string): Notification[] {
    return Array.from(this.notifications.values()).filter((n) => n.userId === userId);
  }

  markAsRead(id: string): Notification | undefined {
    const n = this.notifications.get(id);
    if (!n) return undefined;
    n.read = true;
    return n;
  }
}
