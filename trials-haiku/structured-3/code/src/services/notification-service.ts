// Notification Service - Manages notifications
import { randomUUID } from "crypto";
import { eventBus } from "../event-bus";

interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

class NotificationService {
  private store: Map<string, Notification> = new Map();

  constructor() {
    // Subscribe to events
    this.setupSubscriptions();
  }

  private setupSubscriptions(): void {
    // Subscribe to task.assigned
    eventBus.subscribe("task.assigned", (payload) => {
      const { taskId, taskTitle, assigneeId } = payload;
      this.createNotification(
        assigneeId,
        `You have been assigned to task: ${taskTitle}`
      );
    });

    // Subscribe to task.statusChanged
    eventBus.subscribe("task.statusChanged", (payload) => {
      const { taskId, taskTitle, assigneeId, oldStatus, newStatus } = payload;
      if (assigneeId) {
        this.createNotification(
          assigneeId,
          `Task "${taskTitle}" status changed from ${oldStatus} to ${newStatus}`
        );
      }
    });

    // Subscribe to comment.added
    eventBus.subscribe("comment.added", (payload) => {
      const { taskId, taskTitle, authorName, authorId } = payload;
      // Notification should go to the task assignee, but we'll need to look up the task
      // For now, we'll create a general comment notification
      // The router will need to find who is assigned to this task
      eventBus.publish("notification.commentAdded", {
        taskTitle,
        authorName,
        authorId,
        payload,
      });
    });
  }

  /**
   * Create a notification for a user
   */
  private createNotification(userId: string, message: string): Notification {
    const notification: Notification = {
      id: randomUUID(),
      userId,
      message,
      read: false,
      createdAt: new Date(),
    };
    this.store.set(notification.id, notification);
    return notification;
  }

  /**
   * Get notifications for a user
   */
  getByUser(userId: string): Notification[] {
    return Array.from(this.store.values())
      .filter((notif) => notif.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Mark a notification as read
   */
  markAsRead(notificationId: string): Notification | undefined {
    const notification = this.store.get(notificationId);
    if (!notification) return undefined;

    notification.read = true;
    return notification;
  }

  /**
   * Internal method to handle comment notifications
   * Called by router when needed
   */
  createCommentNotification(taskId: string, authorName: string): void {
    // This is a helper for the router to create notifications for task assignees
    // when a comment is added
  }
}

export const notificationService = new NotificationService();
