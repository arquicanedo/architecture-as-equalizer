/**
 * Notification Service
 * Manages notifications and subscribes to events
 */

import { eventBus } from '../event-bus';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export class NotificationService {
  private store: Map<string, Notification> = new Map();
  private idCounter: number = 0;

  constructor() {
    this.subscribeToEvents();
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `notification_${++this.idCounter}`;
  }

  /**
   * Subscribe to relevant events
   */
  private subscribeToEvents(): void {
    // Task assigned event
    eventBus.subscribe('task.assigned', (payload) => {
      const { taskId, taskTitle, assigneeId } = payload;
      this.createNotification(assigneeId, `Task "${taskTitle}" has been assigned to you`);
    });

    // Task status changed event
    eventBus.subscribe('task.statusChanged', (payload) => {
      const { taskId, taskTitle, assigneeId, oldStatus, newStatus } = payload;
      if (assigneeId) {
        this.createNotification(
          assigneeId,
          `Task "${taskTitle}" status changed from ${oldStatus} to ${newStatus}`
        );
      }
    });

    // Comment added event
    eventBus.subscribe('comment.added', (payload) => {
      const { commentId, taskId, taskTitle, authorId, authorName } = payload;
      // In a real system, we'd query who the task is assigned to
      // For now, we'll notify based on task ownership which would be tracked elsewhere
      this.createNotification(authorId, `Your comment was added to task "${taskTitle}"`);
    });
  }

  /**
   * Create a notification
   */
  private createNotification(userId: string, message: string): Notification {
    const notification: Notification = {
      id: this.generateId(),
      userId,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.store.set(notification.id, notification);
    return notification;
  }

  /**
   * List notifications for a user
   */
  listNotifications(userId: string): Notification[] {
    return Array.from(this.store.values()).filter(notif => notif.userId === userId);
  }

  /**
   * Get notification by ID
   */
  getNotification(id: string): Notification | null {
    return this.store.get(id) || null;
  }

  /**
   * Mark notification as read
   */
  markAsRead(id: string): Notification | null {
    const notification = this.store.get(id);
    if (!notification) return null;

    notification.read = true;
    return notification;
  }
}

export const notificationService = new NotificationService();
