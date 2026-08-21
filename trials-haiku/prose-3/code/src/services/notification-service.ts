/**
 * Notification Service - Manages notifications for users
 */

import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';
import { TaskService } from './task-service';
import { UserService } from './user-service';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  timestamp: number;
}

export class NotificationService {
  private notifications: Map<string, Notification> = new Map();

  constructor(
    private eventBus: EventBus,
    private taskService: TaskService,
    private userService: UserService
  ) {
    this.setupEventListeners();
  }

  /**
   * Set up listeners for relevant events
   */
  private setupEventListeners(): void {
    // Listen for task assignments
    this.eventBus.subscribe('task.assigned', (payload: any) => {
      const user = this.userService.getUser(payload.userId);
      if (user) {
        this.createNotification(
          payload.userId,
          `You have been assigned to task: "${payload.taskTitle}"`
        );
      }
    });

    // Listen for task status changes
    this.eventBus.subscribe('task.status-changed', (payload: any) => {
      const task = this.taskService.getTask(payload.taskId);
      if (task && payload.assignee) {
        this.createNotification(
          payload.assignee,
          `Task status changed from "${payload.oldStatus}" to "${payload.newStatus}"`
        );
      }
    });

    // Listen for comments added
    this.eventBus.subscribe('comment.added', (payload: any) => {
      const task = this.taskService.getTask(payload.taskId);
      if (task && task.assignee && task.assignee !== payload.authorId) {
        const author = this.userService.getUser(payload.authorId);
        const authorName = author?.name || 'Someone';
        this.createNotification(
          task.assignee,
          `${authorName} commented on your task: "${payload.text.substring(0, 50)}..."`
        );
      }
    });
  }

  /**
   * Create a new notification
   */
  private createNotification(userId: string, message: string): Notification {
    const notification: Notification = {
      id: randomUUID(),
      userId,
      message,
      read: false,
      timestamp: Date.now(),
    };
    this.notifications.set(notification.id, notification);
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
    return Array.from(this.notifications.values()).filter(
      (notification) => notification.userId === userId
    );
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
