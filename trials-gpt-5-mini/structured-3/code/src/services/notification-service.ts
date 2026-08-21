export type Notification = {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
};

import { EventBus } from '../event-bus';

export class NotificationService {
  private store: Map<string, Notification> = new Map();
  private bus: EventBus;
  private idCounter = 1;

  constructor(bus: EventBus) {
    this.bus = bus;
    this.bus.subscribe('task.assigned', (p) => this.onTaskAssigned(p));
    this.bus.subscribe('task.statusChanged', (p) => this.onTaskStatusChanged(p));
    this.bus.subscribe('comment.added', (p) => this.onCommentAdded(p));
  }

  private nextId(): string {
    return String(this.idCounter++);
  }

  private createNotification(userId: string | undefined, message: string) {
    if (!userId) return; // no one to notify
    const n: Notification = { id: this.nextId(), userId, message, read: false, createdAt: new Date().toISOString() };
    this.store.set(n.id, n);
  }

  private onTaskAssigned(payload: any) {
    const { taskId, taskTitle, assigneeId } = payload;
    this.createNotification(assigneeId, `You were assigned task ${taskTitle} (${taskId})`);
  }

  private onTaskStatusChanged(payload: any) {
    const { taskId, taskTitle, assigneeId, oldStatus, newStatus } = payload;
    this.createNotification(assigneeId, `Status of ${taskTitle} (${taskId}) changed from ${oldStatus} to ${newStatus}`);
  }

  private onCommentAdded(payload: any) {
    const { taskId, taskTitle, authorName, assigneeId } = payload; // assigneeId may be provided by router when creating comment
    this.createNotification(assigneeId, `${authorName} commented on ${taskTitle} (${taskId})`);
  }

  getByUser(userId: string): Notification[] {
    return Array.from(this.store.values()).filter((n) =&gt; n.userId === userId);
  }

  markAsRead(id: string): Notification | undefined {
    const n = this.store.get(id);
    if (!n) return undefined;
    n.read = true;
    this.store.set(id, n);
    return n;
  }
}
