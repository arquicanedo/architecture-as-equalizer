import { Notification, UUID } from '../types';
import { uuid } from '../utils';
import { EventBus } from '../event-bus';

export class NotificationService {
  private store: Map<UUID, Notification> = new Map();

  constructor(private bus: EventBus) {
    // subscribe to events
    bus.subscribe('task.assigned', payload => this.onTaskAssigned(payload));
    bus.subscribe('task.statusChanged', payload => this.onTaskStatusChanged(payload));
    bus.subscribe('comment.added', payload => this.onCommentAdded(payload));
  }

  private pushNotification(userId: string | null | undefined, message: string) {
    if (!userId) return;
    const id = uuid();
    const n: Notification = { id, userId, message, read: false, createdAt: new Date().toISOString() };
    this.store.set(id, n);
  }

  private onTaskAssigned(payload: any) {
    const { taskId, taskTitle, assigneeId } = payload;
    this.pushNotification(assigneeId, `Task assigned: ${taskTitle} (${taskId})`);
  }

  private onTaskStatusChanged(payload: any) {
    const { taskId, taskTitle, assigneeId, oldStatus, newStatus } = payload;
    this.pushNotification(assigneeId, `Task status changed: ${taskTitle} (${taskId}) ${oldStatus} -> ${newStatus}`);
  }

  private onCommentAdded(payload: any) {
    const { taskId, taskTitle, authorId, authorName } = payload;
    const { assigneeId } = payload as any;
    if (assigneeId) this.pushNotification(assigneeId, `New comment on ${taskTitle || taskId} by ${authorName || authorId}`);
  }

  getByUser(userId: string): Notification[] {
    return Array.from(this.store.values()).filter(n => n.userId === userId);
  }

  markAsRead(id: UUID): Notification | null {
    const n = this.store.get(id);
    if (!n) return null;
    n.read = true;
    this.store.set(id, n);
    return n;
  }
}
