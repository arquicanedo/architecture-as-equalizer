import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus.js';

export type Notification = {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
};

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
    const id = randomUUID();
    const n: Notification = { id, userId, message, read: false, createdAt: new Date().toISOString() };
    this.store.set(id, n);
    return n;
  }

  private onTaskAssigned(payload: any) {
    const { taskId, taskTitle, assigneeId } = payload ?? {};
    if (!assigneeId) return;
    this.createNotification(assigneeId, `You were assigned task "${taskTitle}" (${taskId})`);
  }

  private onTaskStatusChanged(payload: any) {
    const { taskId, taskTitle, assigneeId, oldStatus, newStatus } = payload ?? {};
    if (!assigneeId) return;
    this.createNotification(assigneeId, `Status of task "${taskTitle}" changed from ${oldStatus} to ${newStatus}`);
  }

  private onCommentAdded(payload: any) {
    const { taskId, taskTitle, authorId, authorName } = payload ?? {};
    // We don't have task assignee here — architectural constraint: cannot read task store.
    // To keep behaviour useful, comment.added payload should include assigneeId when published by router.
    const assigneeId = (payload && payload.assigneeId) ?? null;
    if (!assigneeId) return;
    this.createNotification(assigneeId, `${authorName} commented on task "${taskTitle}"`);
  }

  getByUser(userId: string): Notification[] {
    return Array.from(this.store.values()).filter((n) => n.userId === userId);
  }

  markAsRead(id: string): Notification | null {
    const n = this.store.get(id);
    if (!n) return null;
    n.read = true;
    this.store.set(id, n);
    return n;
  }
}
