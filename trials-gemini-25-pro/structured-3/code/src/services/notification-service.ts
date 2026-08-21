import crypto from "crypto";
import { eventBus } from "../event-bus";
import { TaskService } from "./task-service";

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export class NotificationService {
  private readonly notifications: Map<string, Notification> = new Map();

  // See note in CommentService. We need to query other services to fulfill requirements.
  constructor(private readonly taskService: TaskService) {
    eventBus.subscribe("task.assigned", this.onTaskAssigned.bind(this));
    eventBus.subscribe("task.statusChanged", this.onTaskStatusChanged.bind(this));
    eventBus.subscribe("comment.added", this.onCommentAdded.bind(this));
  }

  private createNotification(userId: string, message: string): Notification {
    const id = crypto.randomUUID();
    const notification: Notification = {
      id,
      userId,
      message,
      read: false,
      createdAt: new Date(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  private onTaskAssigned(payload: { taskId: string; taskTitle: string; assigneeId: string; }) {
    const message = `You have been assigned to a new task: "${payload.taskTitle}"`;
    this.createNotification(payload.assigneeId, message);
  }

  private onTaskStatusChanged(payload: { taskId: string; taskTitle: string; assigneeId: string; oldStatus: string; newStatus: string; }) {
    const message = `The status of your task "${payload.taskTitle}" has changed from ${payload.oldStatus} to ${payload.newStatus}.`;
    this.createNotification(payload.assigneeId, message);
  }

  private onCommentAdded(payload: { commentId: string; taskId: string; taskTitle: string; authorId: string; authorName: string; }) {
    const task = this.taskService.getById(payload.taskId);
    if (task && task.assigneeId && task.assigneeId !== payload.authorId) {
      const message = `A new comment was added to "${payload.taskTitle}" by ${payload.authorName}.`;
      this.createNotification(task.assigneeId, message);
    }
  }

  getByUser(userId: string): Notification[] {
    return Array.from(this.notifications.values()).filter(
      (n) => n.userId === userId && !n.read
    );
  }

  markAsRead(id: string): Notification | undefined {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.read = true;
    }
    return notification;
  }
}
