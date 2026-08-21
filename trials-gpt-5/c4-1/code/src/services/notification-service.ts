import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO 8601
}

export class NotificationService {
  private store: Map<string, Notification> = new Map();
  // Internal cache of task assignees maintained from events
  private taskAssignees: Map<string, string | null> = new Map();

  constructor(private eventBus: EventBus) {
    this.eventBus.subscribe('task.assigned', (payload: { taskId: string; taskTitle: string; assigneeId: string }) => {
      this.taskAssignees.set(payload.taskId, payload.assigneeId);
      const message = `Task '${payload.taskTitle}' assigned to you.`;
      this.createNotification(payload.assigneeId, message);
    });

    this.eventBus.subscribe(
      'task.statusChanged',
      (payload: { taskId: string; taskTitle: string; assigneeId: string | null; oldStatus: string; newStatus: string }) => {
        this.taskAssignees.set(payload.taskId, payload.assigneeId ?? null);
        if (payload.assigneeId) {
          const message = `Task '${payload.taskTitle}' status changed from ${payload.oldStatus} to ${payload.newStatus}.`;
          this.createNotification(payload.assigneeId, message);
        }
      }
    );

    this.eventBus.subscribe(
      'comment.added',
      (payload: { commentId: string; taskId: string; taskTitle: string; authorId: string; authorName: string }) => {
        const assigneeId = this.taskAssignees.get(payload.taskId);
        if (assigneeId) {
          const message = `New comment by ${payload.authorName} on task '${payload.taskTitle}'.`;
          this.createNotification(assigneeId, message);
        }
      }
    );
  }

  private createNotification(userId: string, message: string): Notification {
    const notification: Notification = {
      id: randomUUID(),
      userId,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.store.set(notification.id, notification);
    return notification;
  }

  getByUser(userId: string): Notification[] {
    return Array.from(this.store.values()).filter((n) => n.userId === userId);
  }

  markAsRead(id: string): Notification | undefined {
    const n = this.store.get(id);
    if (!n) return undefined;
    n.read = true;
    this.store.set(id, n);
    return n;
  }
}
