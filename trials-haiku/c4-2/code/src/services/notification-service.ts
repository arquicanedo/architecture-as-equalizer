/**
 * Notification Service
 * Creates notifications from events
 */

import { randomUUID } from "crypto";
import { eventBus } from "../event-bus.js";

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
    this.subscribeToEvents();
  }

  /**
   * Subscribe to events from other services
   */
  private subscribeToEvents(): void {
    // Listen to task.assigned event
    eventBus.subscribe(
      "task.assigned",
      (payload: {
        taskId: string;
        taskTitle: string;
        assigneeId: string;
      }) => {
        if (payload.assigneeId) {
          this.createNotification(
            payload.assigneeId,
            `You have been assigned to task: ${payload.taskTitle}`
          );
        }
      }
    );

    // Listen to task.statusChanged event
    eventBus.subscribe(
      "task.statusChanged",
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
            `Task "${payload.taskTitle}" status changed to ${payload.newStatus}`
          );
        }
      }
    );

    // Listen to comment.added event
    eventBus.subscribe(
      "comment.added",
      (payload: {
        commentId: string;
        taskId: string;
        taskTitle: string;
        authorId: string;
        authorName: string;
      }) => {
        // This would normally notify the task assignee,
        // but we'd need task context. For now, we just log.
        // In a real system, this would look up the task and notify the assignee.
      }
    );
  }

  /**
   * Create a notification (internal method)
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
   * Get notifications for a user
   */
  getByUser(userId: string): Notification[] {
    return Array.from(this.notificationStore.values()).filter(
      (notif) => notif.userId === userId
    );
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): Notification | null {
    const notification = this.notificationStore.get(notificationId);
    if (!notification) return null;

    notification.read = true;
    this.notificationStore.set(notificationId, notification);
    return notification;
  }
}

export const notificationService = new NotificationService();
