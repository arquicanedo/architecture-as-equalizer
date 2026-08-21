import { EventBus } from "../event-bus";

export type Notification = { id: string; userId: string; message: string; read: boolean; createdAt: string };

export class NotificationService {
  private store: Map<string, Notification> = new Map();
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
    this.bus.subscribe('task.assigned', (p) => this.onTaskAssigned(p));
    this.bus.subscribe('task.statusChanged', (p) => this.onTaskStatusChanged(p));
    this.bus.subscribe('comment.added', (p) => this.onCommentAdded(p));
  }

  private createNotification(userId: string, message: string) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const n: Notification = { id, userId, message, read: false, createdAt: new Date().toISOString() };
    this.store.set(id, n);
    return n;
  }

  private onTaskAssigned(payload: any) {
    const { assigneeId, taskTitle } = payload;
    if (!assigneeId) return;
    this.createNotification(assigneeId, `You were assigned task: ${taskTitle}`);
  }

  private onTaskStatusChanged(payload: any) {
    const { assigneeId, taskTitle, oldStatus, newStatus } = payload;
    if (!assigneeId) return;
    this.createNotification(assigneeId, `Task '${taskTitle}' changed status ${oldStatus} -> ${newStatus}`);
  }

  private onCommentAdded(payload: any) {
    const { taskId, taskTitle, authorName } = payload;
    // To find assignee we cannot access task store (constraint). Instead, include assignee in payload? But constraint forbids other services reading stores.
    // Architectural decision: comment.added should notify the task assignee — we require the router to include assigneeId when creating comment event.
    // However, CommentService currently publishes without assignee. The router will pass taskTitle and authorName, and include assigneeId in payload via comment creation.
    const { assigneeId } = payload as any;
    if (!assigneeId) return;
    this.createNotification(assigneeId, `${authorName} commented on task '${taskTitle}'`);
  }

  getByUser(userId: string) {
    return Array.from(this.store.values()).filter((n) => n.userId === userId);
  }

  markAsRead(id: string) {
    const n = this.store.get(id);
    if (!n) return null;
    n.read = true;
    this.store.set(id, n);
    return n;
  }
}
