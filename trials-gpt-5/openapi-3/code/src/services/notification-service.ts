import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO
}

export class NotificationService {
  private notifications: Map<string, Notification> = new Map();

  constructor(bus: EventBus) {
    // Subscribe to events
    bus.subscribe('task.assigned', (payload: any) => {
      const { taskId, taskTitle, assigneeId } = payload;
      if (!assigneeId) return;
      this.createNotification({
        userId: assigneeId,
        message: `You have been assigned to task "${taskTitle}" (${taskId}).`,
      });
    });

    bus.subscribe('task.statusChanged', (payload: any) => {
      const { taskId, taskTitle, assigneeId, oldStatus, newStatus } = payload;
      if (assigneeId) {
        this.createNotification({
          userId: assigneeId,
          message: `Status of task "${taskTitle}" (${taskId}) changed from ${oldStatus} to ${newStatus}.`,
        });
      }
    });

    bus.subscribe('comment.added', (payload: any) => {
      const { commentId, taskId, taskTitle, authorId, authorName } = payload;
      // Notify author themselves? We'll notify all involved users except author if we had that info.
      // With limited data, we'll notify the author as confirmation.
      if (authorId) {
        this.createNotification({
          userId: authorId,
          message: `Your comment (${commentId}) was added to task "${taskTitle}" (${taskId}).`,
        });
      }
    });
  }

  private createNotification(input: { userId: string; message: string }): Notification {
    const n: Notification = {
      id: randomUUID(),
      userId: input.userId,
      message: input.message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(n.id, n);
    return n;
  }

  listNotifications(userId: string): Notification[] {
    return Array.from(this.notifications.values()).filter(n => n.userId === userId);
  }

  markAsRead(id: string): Notification | undefined {
    const n = this.notifications.get(id);
    if (!n) return undefined;
    const updated: Notification = { ...n, read: true };
    this.notifications.set(id, updated);
    return updated;
  }
}
