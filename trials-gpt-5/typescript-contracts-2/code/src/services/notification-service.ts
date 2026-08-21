import { INotificationService, Notification, IEventBus, TaskAssignedPayload, TaskStatusChangedPayload, CommentAddedPayload, ITaskLookup } from "../types";
import { randomUUID } from "crypto";

export class NotificationService implements INotificationService {
  // RULE 2: exclusive data ownership
  private notifications: Map<string, Notification> = new Map();

  constructor(private eventBus: IEventBus, private taskLookup: ITaskLookup) {
    // subscriptions are set up in main.ts as per spec; however, we also expose helper
    // methods to attach to the bus if needed. We'll rely on main.ts to subscribe.
  }

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

  // Subscription handlers — to be wired in main.ts
  onTaskAssigned = (payload: unknown) => {
    const p = payload as TaskAssignedPayload;
    // Track assignee for comment notifications
    this.setAssignee(p.taskId, p.assigneeId);
    // Notify the assignee
    const message = `Task '${p.taskTitle}' assigned to you`;
    this.createNotification(p.assigneeId, message);
  };

  onTaskStatusChanged = (payload: unknown) => {
    const p = payload as TaskStatusChangedPayload;
    // Notify the assignee (if any)
    if (p.assigneeId) {
      const message = `Task '${p.taskTitle}' status changed to ${p.newStatus}`;
      this.createNotification(p.assigneeId, message);
      // keep internal mapping up to date
      this.setAssignee(p.taskId, p.assigneeId);
    }
  };

  onCommentAdded = (payload: unknown) => {
    const p = payload as CommentAddedPayload;
    const assigneeId = this.getAssigneeIdForTask(p.taskId);
    if (assigneeId) {
      const message = `New comment on task '${p.taskTitle}' by ${p.authorName}`;
      this.createNotification(assigneeId, message);
    }
  };

  // Assignee tracking to support comment notifications
  private taskAssignee: Map<string, string> = new Map();
  setAssignee(taskId: string, assigneeId: string) {
    this.taskAssignee.set(taskId, assigneeId);
  }
  clearAssignee(taskId: string) {
    this.taskAssignee.delete(taskId);
  }
  private getAssigneeIdForTask(taskId: string): string | null {
    return this.taskAssignee.get(taskId) ?? null;
  }
}
