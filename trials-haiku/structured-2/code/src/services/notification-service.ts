/**
 * Notification Service - Manages user notifications
 * Data ownership: Notification records (id, userId, message, read, createdAt)
 * Events subscribed:
 *   - task.assigned: creates notification for assignee
 *   - task.statusChanged: creates notification for assignee
 *   - comment.added: creates notification for task assignee
 */

import { EventBus } from "../event-bus.js";

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: number;
}

export class NotificationService {
  private notifications: Map<string, Notification> = new Map();
  private nextId = 1;

  constructor(eventBus: EventBus) {
    // Subscribe to task.assigned event
    eventBus.subscribe("task.assigned", (payload) => {
      this.createNotification(
        payload.assigneeId,
        `Task "${payload.taskTitle}" has been assigned to you`
      );
    });

    // Subscribe to task.statusChanged event
    eventBus.subscribe("task.statusChanged", (payload) => {
      this.createNotification(
        payload.assigneeId,
        `Task "${payload.taskTitle}" status changed from "${payload.oldStatus}" to "${payload.newStatus}"`
      );
    });

    // Subscribe to comment.added event
    eventBus.subscribe("comment.added", (payload) => {
      this.createNotification(
        payload.assigneeId,
        `${payload.authorName} commented on task "${payload.taskTitle}"`
      );
    });
  }

  /**
   * Internal method to create a notification
   */
  private createNotification(userId: string, message: string): Notification {
    const id = `notif_${this.nextId++}`;
    const notification: Notification = {
      id,
      userId,
      message,
      read: false,
      createdAt: Date.now(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  /**
   * Get notifications for a user
   */
  getByUser(userId: string): Notification[] {
    return Array.from(this.notifications.values())
      .filter((notif) => notif.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): Notification | null {
    const notification = this.notifications.get(notificationId);
    if (!notification) return null;

    notification.read = true;
    this.notifications.set(notificationId, notification);
    return notification;
  }
}
