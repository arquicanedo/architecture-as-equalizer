/**
 * Notification Service
 * Manages notification data and operations.
 * Subscribes to events from Task and Comment services.
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

class NotificationService {
  private store: Map<string, Notification> = new Map();

  constructor() {
    // Subscribe to task.assigned event
    eventBus.subscribe('task.assigned', (payload: any) => {
      this.handleTaskAssigned(payload);
    });

    // Subscribe to task.statusChanged event
    eventBus.subscribe('task.statusChanged', (payload: any) => {
      this.handleTaskStatusChanged(payload);
    });

    // Subscribe to comment.added event
    eventBus.subscribe('comment.added', (payload: any) => {
      this.handleCommentAdded(payload);
    });
  }

  /**
   * Handle task.assigned event
   */
  private handleTaskAssigned(payload: any): void {
    const { taskId, taskTitle, assigneeId } = payload;
    if (assigneeId) {
      const message = `You have been assigned to task: "${taskTitle}"`;
      this.createNotificationForUser(assigneeId, message);
    }
  }

  /**
   * Handle task.statusChanged event
   */
  private handleTaskStatusChanged(payload: any): void {
    const { taskId, taskTitle, assigneeId, oldStatus, newStatus } = payload;
    if (assigneeId) {
      const message = `Task "${taskTitle}" status changed from ${oldStatus} to ${newStatus}`;
      this.createNotificationForUser(assigneeId, message);
    }
  }

  /**
   * Handle comment.added event
   */
  private handleCommentAdded(payload: any): void {
    const { commentId, taskId, taskTitle, authorId, authorName } = payload;
    // In a real system, we might notify all task watchers or assignees
    // For this demo, we'll just log it
    console.log(
      `[Notification Service] Comment added on task "${taskTitle}" by ${authorName}`
    );
  }

  /**
   * Create a notification for a user.
   */
  private createNotificationForUser(userId: string, message: string): void {
    const notification: Notification = {
      id: randomUUID(),
      userId,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.store.set(notification.id, notification);
  }

  /**
   * Get all notifications for a user.
   */
  getNotificationsByUser(userId: string): Notification[] {
    return Array.from(this.store.values()).filter(n => n.userId === userId);
  }

  /**
   * Get a notification by ID.
   */
  getNotificationById(id: string): Notification | undefined {
    return this.store.get(id);
  }

  /**
   * Mark a notification as read.
   * Returns the updated notification or undefined if not found.
   */
  markAsRead(id: string): Notification | undefined {
    const notification = this.store.get(id);
    if (!notification) return undefined;

    notification.read = true;
    this.store.set(id, notification);
    return notification;
  }
}

export const notificationService = new NotificationService();
