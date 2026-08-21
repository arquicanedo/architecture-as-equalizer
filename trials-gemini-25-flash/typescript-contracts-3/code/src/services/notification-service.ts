import { Notification, INotificationService, IEventBus, TaskAssignedPayload, TaskStatusChangedPayload, CommentAddedPayload, IUserService, ITaskService } from '../types';
import * as crypto from 'node:crypto';

export class NotificationService implements INotificationService {
  private notifications: Map<string, Notification> = new Map();
  private eventBus: IEventBus;
  private userService: IUserService;
  private taskService: ITaskService;

  constructor(eventBus: IEventBus, userService: IUserService, taskService: ITaskService) {
    this.eventBus = eventBus;
    this.userService = userService;
    this.taskService = taskService;
    this.setupEventSubscriptions();
  }

  private setupEventSubscriptions(): void {
    this.eventBus.subscribe("task.assigned", (payload: unknown) => {
      const p = payload as TaskAssignedPayload;
      if (p.assigneeId) {
        this.createNotification(p.assigneeId, `Task '${p.taskTitle}' assigned to you`);
      }
    });

    this.eventBus.subscribe("task.statusChanged", (payload: unknown) => {
      const p = payload as TaskStatusChangedPayload;
      if (p.assigneeId) {
        this.createNotification(p.assigneeId, `Task '${p.taskTitle}' status changed to ${p.newStatus}`);
      }
    });

    this.eventBus.subscribe("comment.added", (payload: unknown) => {
      const p = payload as CommentAddedPayload;
      try {
        const task = this.taskService.getById(p.taskId);
        if (task.assigneeId) {
          // Removed p.body as it's not part of CommentAddedPayload
          this.createNotification(task.assigneeId, `New comment on your task '${p.taskTitle}' by ${p.authorName}`);
        }
      } catch (error) {
        console.error(`Error processing comment.added event for taskId ${p.taskId}:`, error);
      }
    });
  }

  private createNotification(userId: string, message: string): Notification {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const newNotification: Notification = {
      id,
      userId,
      message,
      read: false,
      createdAt,
    };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  getByUser(userId: string): Notification[] {
    return Array.from(this.notifications.values()).filter(n => n.userId === userId);
  }

  markAsRead(notificationId: string): Notification {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new Error(`Notification with ID ${notificationId} not found`);
    }
    const updatedNotification = { ...notification, read: true };
    this.notifications.set(notificationId, updatedNotification);
    return updatedNotification;
  }
}
