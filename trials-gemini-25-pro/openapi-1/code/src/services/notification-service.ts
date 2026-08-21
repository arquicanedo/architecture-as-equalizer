import * as crypto from 'crypto';
import { eventBus } from '../event-bus';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export class NotificationService {
  private readonly notifications: Map<string, Notification> = new Map();

  constructor() {
    this.registerEventHandlers();
  }

  private registerEventHandlers(): void {
    eventBus.subscribe('task.assigned', (payload) => this.handleTaskAssigned(payload));
    eventBus.subscribe('task.statusChanged', (payload) => this.handleTaskStatusChanged(payload));
    eventBus.subscribe('comment.added', (payload) => this.handleCommentAdded(payload));
  }

  private createNotification(userId: string, message: string): Notification {
    const id = crypto.randomUUID();
    const notification: Notification = {
        id,
        userId,
        message,
        read: false,
        createdAt: new Date().toISOString(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  private handleTaskAssigned(payload: { taskId: string; taskTitle: string; assigneeId: string }): void {
    const message = `You have been assigned to task "${payload.taskTitle}" (ID: ${payload.taskId}).`;
    this.createNotification(payload.assigneeId, message);
  }

  private handleTaskStatusChanged(payload: { taskId: string; taskTitle: string; assigneeId: string; oldStatus: string, newStatus: string }): void {
    const message = `The status of task "${payload.taskTitle}" (ID: ${payload.taskId}) has changed from ${payload.oldStatus} to ${payload.newStatus}.`;
    this.createNotification(payload.assigneeId, message);
  }

  private handleCommentAdded(payload: { commentId: string, taskId: string; taskTitle: string; authorId: string, authorName: string }): void {
    // This is a simplified implementation. A real system would notify all project members.
    // Here we just notify the author of the comment as a demonstration.
    const message = `Your comment on task "${payload.taskTitle}" was added successfully.`;
    this.createNotification(payload.authorId, message);
  }

  public listNotificationsForUser(userId: string): Notification[] {
    return Array.from(this.notifications.values()).filter(
      (notification) => notification.userId === userId
    );
  }

  public markNotificationAsRead(id: string): Notification | undefined {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.read = true;
      this.notifications.set(id, notification)
    }
    return notification;
  }
}
