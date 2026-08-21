import crypto from "crypto";
import { eventBus } from "../event-bus";

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export class NotificationService {
  private readonly notifications: Map<string, Notification> = new Map();

  constructor() {
    eventBus.subscribe("task.assigned", this.handleTaskAssigned.bind(this));
    eventBus.subscribe("task.statusChanged", this.handleTaskStatusChanged.bind(this));
    eventBus.subscribe("comment.added", this.handleCommentAdded.bind(this));
  }

  findByUserId(userId: string): Notification[] {
    return Array.from(this.notifications.values())
        .filter((n) => n.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  findById(id: string): Notification | undefined {
      return this.notifications.get(id);
  }

  markAsRead(id: string): Notification | undefined {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.read = true;
      this.notifications.set(id, notification);
    }
    return notification;
  }

  private createNotification(userId: string, message: string): Notification {
    const id = crypto.randomUUID();
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

  private handleTaskAssigned(payload: {
    taskId: string;
    taskTitle: string;
    assigneeId: string;
  }): void {
    const { taskTitle, assigneeId } = payload;
    const message = `You have been assigned to a new task: "${taskTitle}"`;
    this.createNotification(assigneeId, message);
  }

  private handleTaskStatusChanged(payload: {
    taskId: string;
    taskTitle: string;
    assigneeId: string;
    oldStatus: string;
    newStatus: string;
  }): void {
    const { taskTitle, assigneeId, oldStatus, newStatus } = payload;
    const message = `The status of your task "${taskTitle}" has changed from ${oldStatus} to ${newStatus}.`;
    this.createNotification(assigneeId, message);
  }

  private handleCommentAdded(payload: {
    commentId: string;
    taskId: string;
    taskTitle: string;
    authorId: string;
    authorName: string;
  }): void {
    // This is a simplification. In a real app, we'd notify people
    // subscribed to the task, not the author of the comment.
    // But for this demo, we'll just notify the author.
    const { taskTitle, authorId, authorName } = payload;
    const message = `You, ${authorName}, added a comment to "${taskTitle}".`;
    this.createNotification(authorId, message);
  }
}
