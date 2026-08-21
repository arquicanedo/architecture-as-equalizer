/**
 * Notification Service
 * Creates notifications from events
 */

import { randomUUID } from "crypto";
import { eventBus } from "../event-bus";

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
    this.initializeSubscriptions();
  }

  private initializeSubscriptions(): void {
    // Subscribe to task.assigned events
    eventBus.subscribe("task.assigned", (payload: any) => {
      if (payload.assigneeId) {
        const message = `Task "${payload.taskTitle}" has been assigned to you`;
        this.createNotification(payload.assigneeId, message);
      }
    });

    // Subscribe to task.statusChanged events
    eventBus.subscribe("task.statusChanged", (payload: any) => {
      if (payload.assigneeId) {
        const message = `Task "${payload.taskTitle}" status changed to ${payload.newStatus}`;
        this.createNotification(payload.assigneeId, message);
      }
    });

    // Subscribe to comment.added events
    eventBus.subscribe("comment.added", (payload: any) => {
      // In a real system, we'd fetch the task to get the assignee
      // For now, we'll rely on the router to coordinate this
      // The notification for task assignee will be created by the router
    });
  }

  private createNotification(
    userId: string,
    message: string
  ): Notification {
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

  getByUser(userId: string): Notification[] {
    return Array.from(this.notificationStore.values())
      .filter((notif) => notif.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  markAsRead(id: string): Notification | null {
    const notification = this.notificationStore.get(id);
    if (!notification) return null;

    notification.read = true;
    this.notificationStore.set(id, notification);
    return notification;
  }

  // Internal method for publishing notifications on comment events
  notifyTaskAssigneeOnComment(taskAssigneeId: string | null, taskTitle: string, authorName: string): void {
    if (taskAssigneeId) {
      const message = `${authorName} commented on task "${taskTitle}"`;
      this.createNotification(taskAssigneeId, message);
    }
  }
}

export const notificationService = new NotificationService();
