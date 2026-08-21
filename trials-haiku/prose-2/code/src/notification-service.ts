/**
 * Notification Service - manages notifications for users
 * Listens to events from other services and creates notifications
 */

import { eventBus } from './event-bus.js';
import { taskService } from './task-service.js';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  timestamp: number;
}

export class NotificationService {
  private notifications: Map<string, Notification> = new Map();
  private nextId: number = 1;

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for various events
   */
  private setupEventListeners(): void {
    // Listen for task assignment events
    eventBus.subscribe('task.assigned', (payload) => {
      const userId = payload.userId as string;
      const taskTitle = payload.taskTitle as string;
      this.createNotification(
        userId,
        `You have been assigned to task: "${taskTitle}"`
      );
    });

    // Listen for task status change events
    eventBus.subscribe('task.statusChanged', (payload) => {
      const newStatus = payload.newStatus as string;
      const taskTitle = payload.taskTitle as string;
      const assigneeId = payload.assigneeId as string | undefined;
      if (assigneeId) {
        this.createNotification(
          assigneeId,
          `Task "${taskTitle}" status changed to: ${newStatus}`
        );
      }
    });

    // Listen for comment added events
    eventBus.subscribe('comment.added', (payload) => {
      const taskId = payload.taskId as string;
      const authorId = payload.authorId as string;
      const task = taskService.getTask(taskId);
      if (task && task.assigneeId && task.assigneeId !== authorId) {
        this.createNotification(
          task.assigneeId,
          `A comment was added to your task: "${task.title}"`
        );
      }
    });
  }

  /**
   * Create a new notification
   */
  private createNotification(userId: string, message: string): Notification {
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
  getNotification(notificationId: string): Notification | undefined {
    return this.notifications.get(notificationId);
  }

  /**
   * Get all notifications (optionally filtered by user)
   */
  getAllNotifications(userId?: string): Notification[] {
    const allNotifications = Array.from(this.notifications.values());
    if (userId) {
      return allNotifications.filter(notif => notif.userId === userId);
    }
    return allNotifications;
  }

  /**
   * Mark a notification as read
   */
  markAsRead(notificationId: string): Notification | undefined {
    const notification = this.notifications.get(notificationId);
    if (!notification) return undefined;

    notification.read = true;
    this.notifications.set(notificationId, notification);
    return notification;
  }

  /**
   * Check if a notification exists
   */
  notificationExists(notificationId: string): boolean {
    return this.notifications.has(notificationId);
  }
}

export const notificationService = new NotificationService();
