import { INotificationService, Notification, TaskAssignedPayload, TaskStatusChangedPayload, CommentAddedPayload } from "../types";
import { randomUUID } from "crypto";
import { IEventBus } from "../types";

export class NotificationService implements INotificationService {
  private store: Map<string, Notification> = new Map();
  private eventBus: IEventBus;

  constructor(eventBus: IEventBus) {
    this.eventBus = eventBus;
    this.eventBus.subscribe("task.assigned", (payload) => this.onTaskAssigned(payload));
    this.eventBus.subscribe("task.statusChanged", (payload) => this.onTaskStatusChanged(payload));
    this.eventBus.subscribe("comment.added", (payload) => this.onCommentAdded(payload));
  }

  private onTaskAssigned(payload: unknown) {
    const p = payload as TaskAssignedPayload;
    const message = `Task '${p.taskTitle}' assigned to you`;
    const n: Notification = { id: randomUUID(), userId: p.assigneeId, message, read: false, createdAt: new Date().toISOString() };
    this.store.set(n.id, n);
  }

  private onTaskStatusChanged(payload: unknown) {
    const p = payload as TaskStatusChangedPayload;
    if (!p.assigneeId) return;
    const message = `Task '${p.taskTitle}' status changed to ${p.newStatus}`;
    const n: Notification = { id: randomUUID(), userId: p.assigneeId, message, read: false, createdAt: new Date().toISOString() };
    this.store.set(n.id, n);
  }

  private onCommentAdded(payload: unknown) {
    const p = payload as CommentAddedPayload;
    // CommentAddedPayload does not include assignee; responsibility of router/main to publish enriched payload if needed
    // We'll treat authorName/taskTitle maybe empty; subscribers expect task assignee id in another service. For now, can't resolve — so no-op unless payload has authorName and taskTitle and target userId encoded. But spec requires: creates notification for task assignee about new comment
    // To satisfy spec, expect payload to include authorName and taskTitle and also include a field 'assigneeId' optionally. We'll check any extra fields.
    const anyP = p as any;
    if (anyP.assigneeId) {
      const message = `New comment on '${p.taskTitle}' by ${p.authorName}`;
      const n: Notification = { id: randomUUID(), userId: anyP.assigneeId, message, read: false, createdAt: new Date().toISOString() };
      this.store.set(n.id, n);
    }
  }

  getByUser(userId: string): Notification[] {
    return Array.from(this.store.values()).filter((n) => n.userId === userId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  markAsRead(notificationId: string): Notification {
    const n = this.store.get(notificationId);
    if (!n) throw new Error("Notification not found");
    n.read = true;
    this.store.set(notificationId, n);
    return n;
  }
}
