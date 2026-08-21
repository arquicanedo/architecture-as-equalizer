import { Notification, ID } from '../types';
import { eventBus } from '../event-bus';

export class NotificationService {
  private store: Map<ID, Notification> = new Map();

  constructor() {
    eventBus.subscribe('task.assigned', (p) => this.onTaskAssigned(p));
    eventBus.subscribe('task.statusChanged', (p) => this.onTaskStatusChanged(p));
    eventBus.subscribe('comment.added', (p) => this.onCommentAdded(p));
  }

  private push(userId: ID, message: string) {
    const id = Math.random().toString(36).slice(2, 9);
    const n: Notification = { id, userId, message, read: false, createdAt: new Date().toISOString() };
    this.store.set(id, n);
  }

  private onTaskAssigned(payload: any) {
    const { taskId, taskTitle, assigneeId } = payload;
    if (!assigneeId) return;
    this.push(assigneeId, `You were assigned task ${taskTitle} (${taskId})`);
  }

  private onTaskStatusChanged(payload: any) {
    const { taskId, taskTitle, assigneeId, oldStatus, newStatus } = payload;
    if (!assigneeId) return;
    this.push(assigneeId, `Status of ${taskTitle} (${taskId}) changed from ${oldStatus} to ${newStatus}`);
  }

  private onCommentAdded(payload: any) {
    const { taskId, taskTitle, authorId, authorName } = payload;
    // simplistic: notify all users? we'll create notification to task author (unknown) — instead notify nobody if no assignee
    // In this demo, include a generic message - real systems would lookup watchers
    this.push(authorId, `Your comment on ${taskTitle} (${taskId}) was posted by ${authorName}`);
  }

  listForUser(userId: ID): Notification[] {
    return Array.from(this.store.values()).filter((n) => n.userId === userId);
  }

  markRead(id: ID): Notification | null {
    const n = this.store.get(id);
    if (!n) return null;
    n.read = true;
    this.store.set(id, n);
    return n;
  }
}

export const notificationService = new NotificationService();
