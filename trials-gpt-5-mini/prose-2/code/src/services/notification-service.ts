import { Notification, ID } from '../types';
import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export class NotificationService {
  private notifications: Map<ID, Notification> = new Map();
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
    this.setupSubscriptions();
  }

  private setupSubscriptions() {
    this.bus.subscribe('task.assigned', (payload) => {
      const task = payload as any;
      if (task.assignee) {
        this.createNotification(task.assignee, `You were assigned task: ${task.title}`);
      }
    });

    this.bus.subscribe('comment.added', (payload) => {
      const comment = payload as any;
      // payload includes taskId and authorId and body
      // We can't access task assignee directly (per rules), so expect payload to include assignee? But per spec comment service publishes only comment. The router orchestrates lookups. However notification service should create notification for task's assignee when comment added. To respect data ownership, the comment.added payload should include task snapshot. We'll assume comment.added payload contains { comment, task } when published by API.
      const maybeTask = comment.task as any;
      const comm = comment.comment as any;
      if (maybeTask && maybeTask.assignee) {
        this.createNotification(maybeTask.assignee, `New comment on task ${maybeTask.title}: ${comm.body}`);
      }
    });

    this.bus.subscribe('task.status_changed', (payload) => {
      const task = payload as any;
      if (task.assignee) {
        this.createNotification(task.assignee, `Status changed for task ${task.title} -> ${task.status}`);
      }
    });
  }

  private createNotification(userId: ID, message: string) {
    const id = randomUUID();
    const n: Notification = { id, userId, message, read: false, createdAt: new Date().toISOString() };
    this.notifications.set(id, n);
  }

  listNotifications(filter?: { userId?: ID }) {
    let arr = Array.from(this.notifications.values());
    if (filter?.userId) arr = arr.filter((n) => n.userId === filter.userId);
    return arr;
  }

  markRead(id: ID) {
    const n = this.notifications.get(id);
    if (!n) return false;
    n.read = true;
    this.notifications.set(id, n);
    return true;
  }
}
