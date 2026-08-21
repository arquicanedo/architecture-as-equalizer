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

  constructor(private eventBus: EventBus) {
    this.eventBus.subscribe('task.assigned', (payload) => this.onTaskAssigned(payload));
    this.eventBus.subscribe('task.statusChanged', (payload) => this.onTaskStatusChanged(payload));
    this.eventBus.subscribe('comment.added', (payload) => this.onCommentAdded(payload));
  }

  private createNotification(userId: string | null | undefined, message: string) {
    if (!userId) return;
    const n: Notification = { id: randomUUID(), userId, message, read: false, createdAt: new Date().toISOString() };
    this.store.set(n.id, n);
  }

  private onTaskAssigned(payload: any) {
    const { taskId, taskTitle, assigneeId } = payload;
    this.createNotification(assigneeId, `You were assigned task: ${taskTitle} (${taskId})`);
  }

  private onTaskStatusChanged(payload: any) {
    const { taskId, taskTitle, assigneeId, oldStatus, newStatus } = payload;
    this.createNotification(assigneeId, `Status of task ${taskTitle} (${taskId}) changed from ${oldStatus} to ${newStatus}`);
  }

  private onCommentAdded(payload: any) {
    const { taskId, taskTitle, authorId, authorName } = payload;
    // We don't know assignee here; payload doesn't include it. In our design, comment.added should include taskTitle and author info; notification for assignee requires assigneeId, but to respect service boundaries we rely on router to include assigneeId when publishing comment.added if available. If absent, skip.
    const assigneeId = payload.assigneeId;
    if (!assigneeId) return;
    this.createNotification(assigneeId, `${authorName} commented on task ${taskTitle} (${taskId})`);
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
