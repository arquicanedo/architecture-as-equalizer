import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export class NotificationService {
  private store: Map<string, Notification> = new Map();
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
    this.bus.subscribe('task.assigned', (p) => this.onTaskAssigned(p));
    this.bus.subscribe('task.statusChanged', (p) => this.onTaskStatusChanged(p));
    this.bus.subscribe('comment.added', (p) => this.onCommentAdded(p));
  }

  private make(userId: string, message: string): Notification {
    const id = randomUUID();
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

  // event handlers
  private onTaskAssigned(payload: any) {
    const { taskId, taskTitle, assigneeId } = payload;
    if (!assigneeId) return;
    const msg = `You were assigned task ${taskTitle} (${taskId})`;
    this.make(assigneeId, msg);
  }

  private onTaskStatusChanged(payload: any) {
    const { taskId, taskTitle, assigneeId, oldStatus, newStatus } = payload;
    if (!assigneeId) return;
    const msg = `Status of task ${taskTitle} (${taskId}) changed from ${oldStatus} to ${newStatus}`;
    this.make(assigneeId, msg);
  }

  private onCommentAdded(payload: any) {
    const { commentId, taskId, taskTitle, authorId, authorName } = payload;
    // In this simple demo, notify the task assignee if exists — payload lacks assigneeId, so we can't know.
    // We'll notify the author themselves as a demonstration.
    const msg = `Comment by ${authorName} on ${taskTitle}: ${commentId}`;
    this.make(authorId, msg);
  }
}
