import {
  INotificationService,
  Notification,
  TaskAssignedPayload,
  TaskStatusChangedPayload,
  CommentAddedPayload,
} from "../types";
import { randomUUID } from "crypto";

export class NotificationService implements INotificationService {
  // Exclusive data ownership
  private notifications: Map<string, Notification> = new Map();

  // Projection of task state we care about for notifications
  private taskInfo: Map<string, { title: string; assigneeId: string | null }> = new Map();

  getByUser(userId: string): Notification[] {
    return Array.from(this.notifications.values()).filter((n) => n.userId === userId);
  }

  markAsRead(notificationId: string): Notification {
    const n = this.notifications.get(notificationId);
    if (!n) throw new Error(`Notification not found: ${notificationId}`);
    if (!n.read) {
      n.read = true;
      this.notifications.set(notificationId, n);
    }
    return n;
  }

  // Event handlers to be wired in main.ts
  handleTaskAssigned = (payload: TaskAssignedPayload): void => {
    this.taskInfo.set(payload.taskId, { title: payload.taskTitle, assigneeId: payload.assigneeId });
    this.createNotification(payload.assigneeId, `Task '${payload.taskTitle}' assigned to you`);
  };

  handleTaskStatusChanged = (payload: TaskStatusChangedPayload): void => {
    this.taskInfo.set(payload.taskId, { title: payload.taskTitle, assigneeId: payload.assigneeId });
    if (payload.assigneeId) {
      this.createNotification(
        payload.assigneeId,
        `Task '${payload.taskTitle}' status changed to ${payload.newStatus}`
      );
    }
  };

  handleCommentAdded = (payload: CommentAddedPayload): void => {
    const info = this.taskInfo.get(payload.taskId);
    const title = payload.taskTitle || (info ? info.title : "");
    const assigneeId = info ? info.assigneeId : null;
    if (assigneeId) {
      const authorPart = payload.authorName ? ` by ${payload.authorName}` : "";
      const titlePart = title ? ` '${title}'` : "";
      this.createNotification(assigneeId, `New comment on task${titlePart}${authorPart}`);
    }
  };

  // Internal helper
  private createNotification(userId: string, message: string): Notification {
    const id = randomUUID();
    const n: Notification = {
      id,
      userId,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(id, n);
    return n;
  }
}

export default NotificationService;
