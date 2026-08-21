import { randomUUID } from 'crypto';
import { eventBus } from '../event-bus';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO
}

export class NotificationService {
  private notifications: Map<string, Notification> = new Map();

  constructor() {
    // subscribe to task and comment events
    eventBus.subscribe('task.assigned', (payload: any) => {
      const { taskId, taskTitle, assigneeId } = payload || {};
      if (!assigneeId) return;
      const message = `You have been assigned to task "${taskTitle}" (#${taskId}).`;
      this.create({ userId: assigneeId, message });
    });

    eventBus.subscribe('task.statusChanged', (payload: any) => {
      const { taskId, taskTitle, assigneeId, oldStatus, newStatus } = payload || {};
      if (!assigneeId) return; // notify assignee if exists
      const message = `Task "${taskTitle}" (#${taskId}) status changed from ${oldStatus} to ${newStatus}.`;
      this.create({ userId: assigneeId, message });
    });

    eventBus.subscribe('comment.added', (payload: any) => {
      const { commentId, taskId, taskTitle, authorId, authorName } = payload || {};
      // Notify the author themselves might not be useful; in a real system we'd notify watchers/assignee.
      // For simplicity, notify the author that their comment is recorded.
      const message = `${authorName} commented on task "${taskTitle}" (#${taskId}). Comment ID: ${commentId}.`;
      this.create({ userId: authorId, message });
    });
  }

  private create(input: { userId: string; message: string }): Notification {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const notif: Notification = { id, userId: input.userId, message: input.message, read: false, createdAt };
    this.notifications.set(id, notif);
    return notif;
  }

  listByUser(userId: string): Notification[] {
    return Array.from(this.notifications.values()).filter(n => n.userId === userId);
  }

  markRead(id: string): Notification | undefined {
    const n = this.notifications.get(id);
    if (!n) return undefined;
    n.read = true;
    this.notifications.set(id, n);
    return n;
  }
}
