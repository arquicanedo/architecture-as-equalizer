import { Notification } from '../types';
import { eventBus } from '../event-bus';

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export class NotificationService {
  private store: Map<string, Notification> = new Map();

  constructor() {
    eventBus.subscribe('task.assigned', (payload) => this.onTaskAssigned(payload));
    eventBus.subscribe('task.statusChanged', (payload) => this.onTaskStatusChanged(payload));
    eventBus.subscribe('comment.added', (payload) => this.onCommentAdded(payload));
  }

  private onTaskAssigned(payload: any) {
    const { taskId, taskTitle, assigneeId } = payload;
    const message = `You were assigned task "${taskTitle}" (${taskId})`;
    this.create(assigneeId, message);
  }

  private onTaskStatusChanged(payload: any) {
    const { taskId, taskTitle, assigneeId, oldStatus, newStatus } = payload;
    if (!assigneeId) return;
    const message = `Status of task "${taskTitle}" (${taskId}) changed from ${oldStatus} to ${newStatus}`;
    this.create(assigneeId, message);
  }

  private onCommentAdded(payload: any) {
    const { taskId, taskTitle, authorId, authorName } = payload;
    // Notify all users? For demo, create a notification for the author
    const message = `${authorName} commented on "${taskTitle}" (${taskId})`;
    this.create(authorId, message);
  }

  create(userId: string, message: string): Notification {
    const id = genId();
    const n: Notification = { id, userId, message, read: false, createdAt: new Date().toISOString() };
    this.store.set(id, n);
    return n;
  }

  listByUser(userId: string): Notification[] {
    return Array.from(this.store.values()).filter((n) => n.userId === userId);
  }

  markRead(id: string): Notification | null {
    const n = this.store.get(id);
    if (!n) return null;
    n.read = true;
    this.store.set(id, n);
    return n;
  }
}
