/**
 * Notification Service
 * Manages notifications. Subscribes to events from the event bus.
 * No other service may access this store.
 */

import { eventBus } from '../event-bus';

interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

class NotificationService {
  private store: Map<string, Notification> = new Map();
  private nextId = 1;

  constructor() {
    this.subscribeToEvents();
  }

  /**
   * Subscribe to events from the event bus
   */
  private subscribeToEvents(): void {
    // Subscribe to task.assigned event
    eventBus.subscribe(
      'task.assigned',
      (payload: { taskId: string; taskTitle: string; assigneeId: string }) => {
        this.createNotification(
          payload.assigneeId,
          `You have been assigned to task: ${payload.taskTitle}`
        );
      }
    );

    // Subscribe to task.statusChanged event
    eventBus.subscribe(
      'task.statusChanged',
      (payload: {
        taskId: string;
        taskTitle: string;
        assigneeId: string | null;
        oldStatus: string;
        newStatus: string;
      }) => {
        if (payload.assigneeId) {
          this.createNotification(
            payload.assigneeId,
            `Task "${payload.taskTitle}" status changed from ${payload.oldStatus} to ${payload.newStatus}`
          );
        }
      }
    );

    // Subscribe to comment.added event
    eventBus.subscribe(
      'comment.added',
      (payload: {
        commentId: string;
        taskId: string;
        taskTitle: string;
        authorId: string;
        authorName: string;
      }) => {
        // Notify all users (in a real system, this would be task subscribers)
        // For now, we'll just log that a comment was added
        // The actual notification would be handled by notifying task watchers
      }
    );
  }

  /**
   * Create a notification
   */
  private createNotification(userId: string, message: string): Notification {
    const id = `notification-${this.nextId++}`;
    const createdAt = new Date().toISOString();
    const notification: Notification = {
      id,
      userId,
      message,
      read: false,
      createdAt,
    };
    this.store.set(id, notification);
    return notification;
  }

  /**
   * Get notification by ID
   */
  getById(id: string): Notification | undefined {
    return this.store.get(id);
  }

  /**
   * Get all notifications for a user
   */
  listByUser(userId: string): Notification[] {
    return Array.from(this.store.values())
      .filter(notif => notif.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }

  /**
   * Get all notifications
   */
  listAll(): Notification[] {
    return Array.from(this.store.values());
  }

  /**
   * Mark notification as read
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
