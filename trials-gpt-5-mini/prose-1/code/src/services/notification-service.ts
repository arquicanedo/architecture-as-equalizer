import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export type Notification = {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  timestamp: string;
};

export class NotificationService {
  private notifications: Map<string, Notification> = new Map();

  constructor(private eventBus: EventBus) {
    // subscribe to events
    this.eventBus.subscribe('task.assigned', async (payload) => this.onTaskAssigned(payload));
    this.eventBus.subscribe('comment.added', async (payload) => this.onCommentAdded(payload));
    this.eventBus.subscribe('task.status_changed', async (payload) => this.onStatusChanged(payload));
  }

  private createNotification(userId: string, message: string) {
    const id = randomUUID();
    const n: Notification = { id, userId, message, read: false, timestamp: new Date().toISOString() };
    this.notifications.set(id, n);
    return n;
  }

  private async onTaskAssigned(payload: any) {
    const task = payload.task;
    if (!task || !task.assignee) return;
    this.createNotification(task.assignee, `You were assigned task ${task.title} (id=${task.id})`);
  }

  private async onCommentAdded(payload: any) {
    const comment = payload.comment;
    if (!comment) return;
    // Notify the assignee of the task if present. The payload may not include task assignee, so event origin should include it.
    // To keep services decoupled, assume comment.payload may include task info. If not, we still create a generic notification for the author.
    if (payload.task && payload.task.assignee) {
      const aid = payload.task.assignee;
      this.createNotification(aid, `A new comment was added to task ${payload.task.title} (id=${payload.task.id})`);
    }
  }

  private async onStatusChanged(payload: any) {
    const task = payload.task;
    if (!task) return;
    if (task.assignee) this.createNotification(task.assignee, `Status of task ${task.title} changed to ${task.status}`);
  }

  listNotifications(filter?: { userId?: string }): Notification[] {
    let res = Array.from(this.notifications.values());
    if (filter?.userId) res = res.filter((n) => n.userId === filter.userId);
    return res.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  markRead(id: string): Notification | undefined {
    const n = this.notifications.get(id);
    if (!n) return undefined;
    n.read = true;
    this.notifications.set(id, n);
    return n;
  }
}
