/**
 * Notification Service - Creates notifications from events
 * Subscribes to: task.assigned, task.statusChanged, comment.added
 */

import { randomUUID } from 'crypto';
import { eventBus } from '../event-bus';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export class NotificationService {
  private notificationStore: Map<string, Notification> = new Map();

  constructor() {
    this.setupEventSubscriptions();
  }

  /**
   * Setup subscriptions to events
   */
  private setupEventSubscriptions(): void {
    // Subscribe to task.assigned event
    eventBus.subscribe('task.assigned', (payload) => {
      this.createNotification(
        payload.assigneeId,
        `You have been assigned to task: ${payload.taskTitle}`
      );
    });

    // Subscribe to task.statusChanged event
    eventBus.subscribe('task.statusChanged', (payload) => {
      this.createNotification(
        payload.assigneeId,
        `Task "${payload.taskTitle}" status changed from ${payload.oldStatus} to ${payload.newStatus}`
      );
    });

    // Subscribe to comment.added event
    eventBus.subscribe('comment.added', (payload) => {
      // Note: In a real system, we'd need to know the assignee of the task
      // For now, we'll just publish the event
      // The router/demo will handle associating this with the actual assignee
      console.log(
        `Comment added to task "${payload.taskTitle}" by user ${payload.authorId}`
      );
    });
  }

  /**
   * Internal method to create a notification
   */
  private createNotification(userId: string, message: string): Notification {
    const notification: Notification = {
      id: randomUUID(),
      userId,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.notificationStore.set(notification.id, notification);
    return notification;
  }

  /**
   * Get all notifications for a user
   */
  getByUser(userId: string): Notification[] {
    return Array.from(this.notificationStore.values()).filter(
      notification => notification.userId === userId
    );
  }

  /**
   * Mark a notification as read
   */
  markAsRead(id: string): Notification | undefined {
    const notification = this.notificationStore.get(id);
    if (!notification) {
      return undefined;
    }
    notification.read = true;
    return notification;
  }

  /**
   * Get all notifications (for demo purposes)
   */
  getAll(): Notification[] {
    return Array.from(this.notificationStore.values());
  }
}

export const notificationService = new NotificationService();
