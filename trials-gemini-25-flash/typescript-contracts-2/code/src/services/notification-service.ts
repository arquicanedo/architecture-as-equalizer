import { Notification, INotificationService, IUserService, TaskAssignedPayload, TaskStatusChangedPayload, CommentAddedPayload, User, Task } from '../types';
import * as crypto from 'node:crypto';

interface ITaskServiceForNotifications { // Minimal interface for TaskService
  getById(taskId: string): Task;
}

export class NotificationService implements INotificationService {
  private notifications = new Map<string, Notification>();
  private userService: IUserService;
  private taskService: ITaskServiceForNotifications; // To fetch task details for comment notifications

  constructor(userService: IUserService, taskService: ITaskServiceForNotifications) {
    this.userService = userService;
    this.taskService = taskService;
  }

  // This method is called by event subscribers, not directly via API
  createNotification(userId: string, message: string): Notification {
    const newNotification: Notification = {
      id: crypto.randomUUID(),
      userId: userId,
      message: message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    // For in-memory storage, we might want to cap notifications per user or just keep adding
    // For simplicity, just add to the map.
    this.notifications.set(newNotification.id, newNotification);
    return newNotification;
  }

  getByUser(userId: string): Notification[] {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  markAsRead(notificationId: string): Notification {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new Error(`Notification with ID ${notificationId} not found`);
    }
    notification.read = true;
    this.notifications.set(notificationId, notification);
    return notification;
  }

  // Event Handlers (these will be wired up in main.ts)
  handleTaskAssigned = (payload: unknown) => {
    const assignedPayload = payload as TaskAssignedPayload;
    try {
      const assignee = this.userService.getById(assignedPayload.assigneeId);
      this.createNotification(
        assignedPayload.assigneeId,
        `Task '${assignedPayload.taskTitle}' has been assigned to you.`
      );
    } catch (error) {
      console.error('Error handling task.assigned event:', error);
    }
  };

  handleTaskStatusChanged = (payload: unknown) => {
    const statusChangedPayload = payload as TaskStatusChangedPayload;
    if (statusChangedPayload.assigneeId) {
      try {
        const assignee = this.userService.getById(statusChangedPayload.assigneeId);
        this.createNotification(
          statusChangedPayload.assigneeId,
          `Status of task '${statusChangedPayload.taskTitle}' changed to ${statusChangedPayload.newStatus}.`
        );
      } catch (error) {
        console.error('Error handling task.statusChanged event:', error);
      }
    }
  };

  handleCommentAdded = (payload: unknown) => {
    const commentAddedPayload = payload as CommentAddedPayload;
    // Notify the task assignee if there is one
    if (commentAddedPayload.taskAssigneeId) {
      try {
        const assignee = this.userService.getById(commentAddedPayload.taskAssigneeId);
        // To get the task title for the notification, we need the task service
        const task = this.taskService.getById(commentAddedPayload.taskId);
        const author = this.userService.getById(commentAddedPayload.authorId);
        this.createNotification(
          commentAddedPayload.taskAssigneeId,
          `'${author.name}' commented on your task '${task.title}'.`
        );
      } catch (error) {
        console.error('Error handling comment.added event:', error);
      }
    }
  };
}
