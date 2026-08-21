// ============================================================
// Notification Service — INotificationService implementation
// ============================================================

import { randomUUID } from "crypto";
import {
  eventBus,
  TaskAssignedPayload,
  TaskStatusChangedPayload,
  CommentAddedPayload,
} from "../event-bus";

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO 8601
}

interface INotificationService {
  getByUser(userId: string): Notification[];
  markAsRead(notificationId: string): Notification;
}

class NotificationService implements INotificationService {
  private store: Map<string, Notification> = new Map();

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
    return Array.from(this.store.values()).filter(
      (n) => n.userId === userId
    );
  }

  markAsRead(notificationId: string): Notification {
    const notification = this.store.get(notificationId);
    if (!notification) {
      throw new Error(`Notification not found: ${notificationId}`);
    }
    const updated: Notification = { ...notification, read: true };
    this.store.set(notificationId, updated);
    return updated;
  }

  /** Wire all event-bus subscriptions. Called once from main.ts. */
  wireEvents(): void {
    // "task.assigned" → notify the new assignee
    eventBus.subscribe("task.assigned", (payload) => {
      const { assigneeId, taskTitle } = payload as TaskAssignedPayload;
      this.createNotification(
        assigneeId,
        `Task '${taskTitle}' assigned to you`
      );
    });

    // "task.statusChanged" → notify the assignee (if any)
    eventBus.subscribe("task.statusChanged", (payload) => {
      const { assigneeId, taskTitle, newStatus } =
        payload as TaskStatusChangedPayload;
      if (assigneeId) {
        this.createNotification(
          assigneeId,
          `Task '${taskTitle}' status changed to ${newStatus}`
        );
      }
    });

    // "comment.added" → notify the task assignee (if different from the author)
    eventBus.subscribe("comment.added", (payload) => {
      const { assigneeId, taskTitle, authorId, authorName } =
        payload as CommentAddedPayload;
      if (assigneeId && assigneeId !== authorId) {
        this.createNotification(
          assigneeId,
          `New comment on task '${taskTitle}' by ${authorName}`
        );
      }
    });
  }
}

export const notificationService = new NotificationService();
