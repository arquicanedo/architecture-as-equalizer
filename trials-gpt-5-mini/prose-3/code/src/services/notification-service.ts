import { EventBus } from '../event-bus';

export type Notification = {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export class NotificationService {
  private notifications: Map<string, Notification> = new Map();

  constructor(private bus: EventBus) {
    // subscribe to events
    this.bus.on('task.assigned', (payload) => this.onTaskAssigned(payload));
    this.bus.on('comment.added', (payload) => this.onCommentAdded(payload));
    this.bus.on('task.status_changed', (payload) => this.onTaskStatusChanged(payload));
  }

  getAll(filter?: { userId?: string }): Notification[] {
    let arr = Array.from(this.notifications.values());
    if (filter?.userId) arr = arr.filter((n) => n.userId === filter.userId);
    return arr;
  }

  markRead(id: string): Notification | undefined {
    const n = this.notifications.get(id);
    if (!n) return undefined;
    n.read = true;
    this.notifications.set(id, n);
    return n;
  }

  private notify(userId: string, message: string) {
    const id = this.generateId();
    const n: Notification = { id, userId, message, read: false, createdAt: new Date().toISOString() };
    this.notifications.set(id, n);
  }

  private onTaskAssigned(payload: any) {
    const task = payload as any;
    if (task.assignee) {
      this.notify(task.assignee, `You were assigned task ${task.title} (id: ${task.id})`);
    }
  }

  private onCommentAdded(payload: any) {
    const comment = payload as any;
    // We don't have direct access to task service here; assume payload includes task info? spec says Notification Service should create notification for task's assignee.
    // Since services don't call each other, the CommentService will include only comment. To find assignee, the router orchestration should emit a richer event.
    // However we can attempt to handle if payload.taskAssignee exists
    if (comment.taskAssignee) {
      // avoid notifying the commenter
      if (comment.taskAssignee !== comment.authorId) {
        this.notify(comment.taskAssignee, `New comment on task ${comment.taskId} by ${comment.authorId}: ${comment.body}`);
      }
    }
  }

  private onTaskStatusChanged(payload: any) {
    const task = payload as any;
    if (task.assignee) {
      this.notify(task.assignee, `Status of task ${task.title} changed to ${task.status}`);
    }
  }

  private generateId() {
    return Math.random().toString(36).slice(2, 9);
  }
}
