import { EventBus } from '../event-bus';

export type Comment = {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export class CommentService {
  private store: Map<string, Comment> = new Map();
  private bus: EventBus;
  constructor(bus: EventBus) {
    this.bus = bus;
  }

  // meta may include taskTitle, authorName, assigneeId to allow creating rich events
  create(comment: Omit<Comment, 'createdAt'> & { createdAt?: string }, meta?: { taskTitle?: string; authorName?: string; assigneeId?: string }): Comment {
    if (this.store.has(comment.id)) throw new Error('Comment exists');
    const c: Comment = { ...comment, createdAt: comment.createdAt ?? new Date().toISOString() };
    this.store.set(c.id, c);
    // publish event with enriched data if provided
    this.bus.publish('comment.added', {
      commentId: c.id,
      taskId: c.taskId,
      taskTitle: meta?.taskTitle,
      authorId: c.authorId,
      authorName: meta?.authorName,
      assigneeId: meta?.assigneeId,
    });
    return c;
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.store.values()).filter((c) => c.taskId === taskId);
  }

  getById(id: string): Comment | undefined {
    return this.store.get(id);
  }

  delete(id: string): void {
    this.store.delete(id);
  }
}
