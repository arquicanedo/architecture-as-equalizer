import { randomUUID } from "crypto";
import {
  Notification,
  INotificationService,
  IEventBus,
  TaskAssignedPayload,
  TaskStatusChangedPayload,
  CommentAddedPayload,
} from "../types";

export class NotificationService implements INotificationService {
  private store: Map<string, Notification> = new Map();

  constructor(
    eventBus: IEventBus,
    // Injected resolver: given a taskId, returns the assigneeId (or null)
    resolveTaskAssignee: (taskId: string) => string | null
  ) {
    // Subscribe to task.assigned
    eventBus.subscribe("task.assigned", (payload) => {
      const p = payload as TaskAssignedPayload;
      this.createNotification(
        p.assigneeId,
        `Task '${p.taskTitle}' assigned to you`
      );
    });

    // Subscribe to task.statusChanged
    eventBus.subscribe("task.statusChanged", (payload) => {
      const p = payload as TaskStatusChangedPayload;
      if (p.assigneeId) {
        this.createNotification(
          p.assigneeId,
          `Task '${p.taskTitle}' status changed to ${p.newStatus}`
        );
      }
    });

    // Subscribe to comment.added — notify task assignee
    eventBus.subscribe("comment.added", (payload) => {
      const p = payload as CommentAddedPayload;
      const assigneeId = resolveTaskAssignee(p.taskId);
      if (assigneeId && assigneeId !== p.authorId) {
        this.createNotification(
          assigneeId,
          `${p.authorName} commented on task '${p.taskTitle}'`
        );
      }
    });
  }

  private createNotification(userId: string, message: string): Notification {
    const notification: Notification = {
      id: randomUUID(),
      userId,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.store.set(notification.id, notification);
    return { ...notification };
  }

  getByUser(userId: string): Notification[] {
    return Array.from(this.store.values())
      .filter((n) => n.userId === userId)
      .map((n) => ({ ...n }));
  }

  markAsRead(notificationId: string): Notification {
    const notification = this.store.get(notificationId);
    if (!notification) {
      throw new Error(`Notification not found: ${notificationId}`);
    }
    notification.read = true;
    this.store.set(notificationId, notification);
    return { ...notification };
  }
}
