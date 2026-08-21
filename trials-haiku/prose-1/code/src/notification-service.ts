/**
 * Notification Service - Manages notifications and reacts to events
 */

import { eventBus } from './event-bus';
import { userService } from './user-service';
import { taskService } from './task-service';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  timestamp: number;
}

export class NotificationService {
  private notifications: Map<string, Notification> = new Map();
  private nextId = 1;

  constructor() {
    this.setupEventSubscriptions();
  }

  /**
   * Setup event subscriptions
   */
  private setupEventSubscriptions(): void {
    // When a task is assigned
    eventBus.subscribe('task.assigned', (payload) => {
      const assignee = payload.assignee as string;
      const taskId = payload.taskId as string;
      const task = taskService.getTask(taskId);

      if (task) {
        const message = `You have been assigned to task: ${task.title}`;
        this.createNotification(assignee, message);
      }
    });

    // When task status changes
    eventBus.subscribe('task.status-changed', (payload) => {
      const assignee = payload.assignee as string | null;
      const newStatus = payload.newStatus as string;
      const taskId = payload.taskId as string;
      const task = taskService.getTask(taskId);

      if (assignee && task) {
        const message = `Task "${task.title}" status changed to: ${newStatus}`;
        this.createNotification(assignee, message);
      }
    });

    // When a comment is added
    eventBus.subscribe('comment.added', (payload) => {
      const assignee = payload.assignee as string | null;
      const taskId = payload.taskId as string;
      const authorId = payload.authorId as string;
      const author = userService.getUser(authorId);
      const task = taskService.getTask(taskId);

      if (assignee && author && task && assignee !== authorId) {
        const message = `${author.name} commented on task: ${task.title}`;
        this.createNotification(assignee, message);
      }
    });
  }

  /**
   * Create a notification
   */
  private createNotification(userId: string, message: string): Notification | null {
    // Verify user exists
    if (!userService.userExists(userId)) return null;

    const id = `notification-${this.nextId++}`;
    const notification: Notification = {
      id,
      userId,
      message,
      read: false,
      timestamp: Date.now(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  /**
   * Get a notification by ID
   */
  getNotification(id: string): Notification | null {
    return this.notifications.get(id) || null;
  }

  /**
   * Get all notifications
   */
  getAllNotifications(): Notification[] {
    return Array.from(this.notifications.values());
  }

  /**
   * Get notifications for a specific user
   */
  getNotificationsByUser(userId: string): Notification[] {
    return Array.from(this.notifications.values())
      .filter((notif) => notif.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Mark a notification as read
   */
  markAsRead(id: string): Notification | null {
    const notification = this.notifications.get(id);
    if (!notification) return null;

    notification.read = true;
    return notification;
  }

  /**
   * Delete a notification
   */
  deleteNotification(id: string): boolean {
    return this.notifications.delete(id);
  }
}

export const notificationService = new NotificationService();
