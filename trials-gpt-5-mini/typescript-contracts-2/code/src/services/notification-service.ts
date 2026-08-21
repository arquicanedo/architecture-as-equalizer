import { INotificationService, Notification, TaskAssignedPayload, TaskStatusChangedPayload, CommentAddedPayload } from "../types";
import { EventBus } from "../event-bus";

const genId = (): string => {
  if (typeof (globalThis as any).crypto?.randomUUID === "function") return (globalThis as any).crypto.randomUUID();
  return "n-" + Math.random().toString(36).slice(2, 10);
};

export class NotificationService implements INotificationService {
  private store: Map<string, Notification> = new Map();
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;

    this.bus.subscribe("task.assigned", (payload) => {
      const p = payload as TaskAssignedPayload;
      const msg = `Task '${p.taskTitle}' assigned to you`;
      const n: Notification = { id: genId(), userId: p.assigneeId, message: msg, read: false, createdAt: new Date().toISOString() };
      this.store.set(n.id, n);
    });

    this.bus.subscribe("task.statusChanged", (payload) => {
      const p = payload as TaskStatusChangedPayload;
      if (!p.assigneeId) return;
      const msg = `Task '${p.taskTitle}' status changed to ${p.newStatus}`;
      const n: Notification = { id: genId(), userId: p.assigneeId, message: msg, read: false, createdAt: new Date().toISOString() };
      this.store.set(n.id, n);
    });

    this.bus.subscribe("comment.added", (payload) => {
      const p = payload as CommentAddedPayload;
      // We expect main to have enriched payload with assigneeId and authorName/taskTitle maybe; but spec: creates notification for task assignee about new comment
      // If payload doesn't include assigneeId, ignore
      const anyp = payload as any;
      if (!anyp.assigneeId) return;
      const msg = `New comment on task '${anyp.taskTitle}' by ${anyp.authorName}`;
      const n: Notification = { id: genId(), userId: anyp.assigneeId, message: msg, read: false, createdAt: new Date().toISOString() };
      this.store.set(n.id, n);
    });
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
