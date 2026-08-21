import { randomUUID } from "crypto";
import {
  Notification,
  INotificationService,
  IEventBus,
  ITaskService,
  TaskAssignedPayload,
  TaskStatusChangedPayload,
  CommentAddedPayload,
} from "../types";

export class NotificationService implements INotificationService {
  private notifications = new Map<string, Notification>();

  constructor(
    private eventBus: IEventBus,
    private taskService: ITaskService
  ) {}

  public subscribeToEvents(): void {
    this.eventBus.subscribe("task.assigned", (payload) =>
      this.handleTaskAssigned(payload as TaskAssignedPayload)
    );
    this.eventBus.subscribe("task.statusChanged", (payload) =>
      this.handleTaskStatusChanged(payload as TaskStatusChangedPayload)
    );
    this.eventBus.subscribe("comment.added", (payload) =>
      this.handleCommentAdded(payload as CommentAddedPayload)
    );
  }

  private create(userId: string, message: string): Notification {
    const id = randomUUID();
    const notification: Notification = {
      id,
      userId,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  private handleTaskAssigned(payload: TaskAssignedPayload): void {
    const message = `Task '${payload.taskTitle}' has been assigned to you.`;
    this.create(payload.assigneeId, message);
  }

  private handleTaskStatusChanged(payload: TaskStatusChangedPayload): void {
    if (payload.assigneeId) {
      const message = `Task '${payload.taskTitle}' status changed from ${payload.oldStatus} to ${payload.newStatus}.`;
      this.create(payload.assigneeId, message);
    }
  }

  private handleCommentAdded(payload: CommentAddedPayload): void {
    try {
      const task = this.taskService.getById(payload.taskId);
      if (task && task.assigneeId && task.assigneeId !== payload.authorId) {
        const message = `${payload.authorName} commented on your assigned task '${payload.taskTitle}'.`;
        this.create(task.assigneeId, message);
      }
    } catch (error) {
      console.error(`Error creating notification for comment: ${error}`);
    }
  }

  getByUser(userId: string): Notification[] {
    return Array.from(this.notifications.values())
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  markAsRead(notificationId: string): Notification {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new Error(`Notification with id ${notificationId} not found`);
    }
    notification.read = true;
    this.notifications.set(notificationId, notification);
    return notification;
  }
}
