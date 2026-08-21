import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

type TaskAssignedEvent = { taskId: string; taskTitle: string; assigneeId: string | null };

type TaskStatusChangedEvent = {
  taskId: string;
  taskTitle: string;
  assigneeId: string | null;
  oldStatus: string;
  newStatus: string;
};

type CommentAddedEvent = {
  commentId: string;
  taskId: string;
  taskTitle: string;
  authorId: string;
  authorName: string;
  assigneeId?: string | null;
};

export class NotificationService {
  private notifications: Map<string, Notification> = new Map();

  constructor(eventBus: EventBus) {
    // Subscribe to events
    eventBus.subscribe('task.assigned', (payload: TaskAssignedEvent) => {
      if (!payload.assigneeId) return; // no target
      const message = `You were assigned to task "${payload.taskTitle}"`;
      this.createNotification(payload.assigneeId, message);
    });

    eventBus.subscribe('task.statusChanged', (payload: TaskStatusChangedEvent) => {
      if (!payload.assigneeId) return;
      const message = `Task "${payload.taskTitle}" status changed: ${payload.oldStatus} -> ${payload.newStatus}`;
      this.createNotification(payload.assigneeId, message);
    });

    eventBus.subscribe('comment.added', (payload: CommentAddedEvent) => {
      const assigneeId = payload.assigneeId ?? undefined;
      if (!assigneeId) return; // cannot notify without target
      const message = `${payload.authorName || 'Someone'} commented on task "${payload.taskTitle}"`;
      this.createNotification(assigneeId, message);
    });
  }

  private createNotification(userId: string, message: string) {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const notif: Notification = { id, userId, message, read: false, createdAt };
    this.notifications.set(id, notif);
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
