/**
 * Notification Service: Manages notifications
 * Data: { id, userId, message, read, createdAt }
 * Events subscribed: task.assigned, task.statusChanged, comment.added
 */

import { eventBus } from '../event-bus';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export class NotificationService {
  private store: Map<string, Notification> = new Map();
  private idCounter = 0;

  constructor() {
    this.setupEventSubscriptions();
  }

  /**
   * Setup subscriptions to events from other services
   */
  private setupEventSubscriptions(): void {
    // Subscribe to task assignment events
    eventBus.subscribe('task.assigned', (payload: any) => {
      if (payload.assigneeId) {
        this.createNotification(
          payload.assigneeId,
          `You have been assigned to task: "${payload.taskTitle}"`
        );
      }
    });

    // Subscribe to task status change events
    eventBus.subscribe('task.statusChanged', (payload: any) => {
      if (payload.assigneeId) {
        this.createNotification(
          payload.assigneeId,
          `Task "${payload.taskTitle}" status changed from ${payload.oldStatus} to ${payload.newStatus}`
        );
      }
    });

    // Subscribe to comment added events
    eventBus.subscribe('comment.added', (payload: any) => {
      // Send notification to task assignee (if any)
      // The router will need to look up the assignee separately
      this.createNotification(
        payload.authorId,
        `You added a comment to task "${payload.taskTitle}"`
      );
    });
  }

  /**
   * Create a notification (internal)
   */
  private createNotification(userId: string, message: string): Notification {
    const id = `n${++this.idCounter}`;
    const notification: Notification = {
      id,
      userId,
      message,
      read: false,
      createdAt: new Date(),
    };
    this.store.set(id, notification);
    return notification;
  }

  /**
   * Get notifications by user
   */
  getByUser(userId: string): Notification[] {
    return Array.from(this.store.values()).filter(
      notif => notif.userId === userId
    );
  }

  /**
   * Mark a notification as read
   */
  markAsRead(notificationId: string): Notification | undefined {
    const notification = this.store.get(notificationId);
    if (!notification) return undefined;

    notification.read = true;
    this.store.set(notificationId, notification);
    return notification;
  }

  /**
   * Get all notifications (for testing/demo)
   */
  getAll(): Notification[] {
    return Array.from(this.store.values());
  }
}

export const notificationService = new NotificationService();
