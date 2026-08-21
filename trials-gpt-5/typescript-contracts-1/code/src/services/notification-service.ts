import { randomUUID } from "node:crypto";
import {
  CommentAddedPayload,
  IEventBus,
  INotificationService,
  Notification,
  TaskAssignedPayload,
  TaskStatusChangedPayload,
  GetTaskTitle,
  GetUserName,
} from "../types";

export class NotificationService implements INotificationService {
  private notifications: Map<string, Notification> = new Map();

  constructor(
    private bus: IEventBus,
    // Lookup helpers passed from main/router to avoid cross-service imports
    private getUserName: GetUserName,
    private getTaskTitle: GetTaskTitle,
    private getTaskAssigneeId: (taskId: string) => string | null,
  ) {}

  private createForUser(userId: string, message: string): Notification {
    const id = randomUUID();
    const notif: Notification = {
      id,
      userId,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(id, notif);
    return notif;
  }

  wireSubscriptions(): void {
    this.bus.subscribe("task.assigned", (payload) => {
      const p = payload as TaskAssignedPayload;
      const title = this.getTaskTitle(p.taskId) || p.taskTitle;
      this.createForUser(p.assigneeId, `Task '${title}' assigned to you`);
    });

    this.bus.subscribe("task.statusChanged", (payload) => {
      const p = payload as TaskStatusChangedPayload;
      const title = this.getTaskTitle(p.taskId) || p.taskTitle;
      if (p.assigneeId) {
        this.createForUser(p.assigneeId, `Task '${title}' status changed to ${p.newStatus}`);
      }
    });

    this.bus.subscribe("comment.added", (payload) => {
      const p = payload as CommentAddedPayload;
      const title = this.getTaskTitle(p.taskId) || p.taskTitle || "Task";
      const assigneeId = this.getTaskAssigneeId(p.taskId);
      if (assigneeId) {
        const authorName = this.getUserName(p.authorId) || p.authorName || "Someone";
        this.createForUser(assigneeId, `New comment on '${title}' by ${authorName}`);
      }
    });
  }

  getByUser(userId: string): Notification[] {
    return Array.from(this.notifications.values()).filter((n) => n.userId === userId);
  }

  markAsRead(notificationId: string): Notification {
    const n = this.notifications.get(notificationId);
    if (!n) throw new Error("Notification not found");
    const updated: Notification = { ...n, read: true };
    this.notifications.set(notificationId, updated);
    return updated;
  }
}
