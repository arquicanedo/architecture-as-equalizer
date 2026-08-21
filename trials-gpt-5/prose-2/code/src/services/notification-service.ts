import { EventBus, TaskAssignedEvent, TaskStatusChangedEvent, CommentAddedEvent, TaskCreatedEvent, TaskDeletedEvent, CommentAddedEnrichedEvent } from '../event-bus';

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  timestamp: number;
}

export class NotificationService {
  private notifications: Map<string, Notification> = new Map();

  constructor(private bus: EventBus) {
    // Subscribe to events
    this.bus.subscribe<TaskAssignedEvent>('task.assigned', (e) => this.onTaskAssigned(e));
    this.bus.subscribe<TaskStatusChangedEvent>('task.statusChanged', (e) => this.onTaskStatusChanged(e));
    this.bus.subscribe<CommentAddedEvent>('comment.added', (e) => this.onCommentAdded(e));
    this.bus.subscribe<CommentAddedEnrichedEvent>('comment.added.enriched', (e) => this.onCommentAddedEnriched(e));
    this.bus.subscribe<TaskCreatedEvent>('task.created', (e) => this.onTaskCreated(e));
    this.bus.subscribe<TaskDeletedEvent>('task.deleted', (e) => this.onTaskDeleted(e));
  }

  private onTaskAssigned(e: TaskAssignedEvent) {
    this.create({ userId: e.assigneeId, message: `You were assigned task '${e.title}' in project ${e.projectId}` });
  }

  private onTaskStatusChanged(e: TaskStatusChangedEvent) {
    if (e.assigneeId) {
      this.create({ userId: e.assigneeId, message: `Task '${e.title}' status changed ${e.from} -> ${e.to}` });
    }
  }

  private onCommentAdded(_e: CommentAddedEvent) {
    // noop unless enriched event is used
  }

  private onCommentAddedEnriched(e: CommentAddedEnrichedEvent) {
    if (e.taskAssigneeId && e.taskAssigneeId !== e.authorId) {
      this.create({ userId: e.taskAssigneeId, message: `New comment on your task: "${e.text}"` });
    }
  }

  private onTaskCreated(e: TaskCreatedEvent) {
    if (e.assigneeId) {
      this.create({ userId: e.assigneeId, message: `You have a new assigned task '${e.title}'` });
    }
  }

  private onTaskDeleted(e: TaskDeletedEvent) {
    if (e.assigneeId) {
      this.create({ userId: e.assigneeId, message: `Task '${e.title}' was deleted` });
    }
  }

  list(filter?: { userId?: string }): Notification[] {
    let arr = Array.from(this.notifications.values());
    if (filter?.userId) arr = arr.filter((n) => n.userId === filter.userId);
    arr.sort((a, b) => a.timestamp - b.timestamp);
    return arr;
  }

  get(id: string): Notification | undefined {
    return this.notifications.get(id);
  }

  create(input: { userId: string; message: string }): Notification {
    const id = this.generateId();
    const notification: Notification = { id, userId: input.userId, message: input.message, read: false, timestamp: Date.now() };
    this.notifications.set(id, notification);
    return notification;
  }

  markRead(id: string): Notification | undefined {
    const n = this.notifications.get(id);
    if (!n) return undefined;
    n.read = true;
    return n;
  }

  private generateId(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}
