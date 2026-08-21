import { EventBus } from "../event-bus";

export type Notification = { id: string; userId: string; message: string; read: boolean; createdAt: string };

export class NotificationService {
  private store: Map<string, Notification> = new Map();
  private bus: EventBus;
  private idCounter = 1;

  constructor(bus: EventBus) {
    this.bus = bus;
    this.bus.subscribe('task.assigned', (payload) => this.onTaskAssigned(payload));
    this.bus.subscribe('task.statusChanged', (payload) => this.onTaskStatusChanged(payload));
    this.bus.subscribe('comment.added', (payload) => this.onCommentAdded(payload));
  }

  private makeNotification(userId: string, message: string): Notification {
    const id = String(this.idCounter++);
    const n: Notification = { id, userId, message, read: false, createdAt: new Date().toISOString() };
    this.store.set(id, n);
    return n;
  }

  private onTaskAssigned(payload: any) {
    const { assigneeId, taskTitle } = payload;
    if (!assigneeId) return;
    const msg = `You were assigned task: ${taskTitle ?? payload.taskId}`;
    this.makeNotification(assigneeId, msg);
  }

  private onTaskStatusChanged(payload: any) {
    const { assigneeId, taskTitle, oldStatus, newStatus } = payload;
    if (!assigneeId) return;
    const msg = `Task "${taskTitle ?? payload.taskId}" status changed from ${oldStatus} to ${newStatus}`;
    this.makeNotification(assigneeId, msg);
  }

  private onCommentAdded(payload: any) {
    const { taskId, taskTitle, authorName } = payload;
    // We need to notify the assignee of the task. But NotificationService doesn't own tasks and must not read TaskStore.
    // The router will include assigneeId in the comment.added event payload if available. If not present, skip.
    const { assigneeId } = payload;
    if (!assigneeId) return;
    const msg = `${authorName ?? 'Someone'} commented on task "${taskTitle ?? taskId}"`;
    this.makeNotification(assigneeId, msg);
  }

  getByUser(userId: string): Notification[] {
    return Array.from(this.store.values()).filter((n) => n.userId === userId);
  }

  markAsRead(id: string): Notification | undefined {
    const n = this.store.get(id);
    if (!n) throw new Error('Not found');
    n.read = true;
    this.store.set(id, n);
    return n;
  }
}
