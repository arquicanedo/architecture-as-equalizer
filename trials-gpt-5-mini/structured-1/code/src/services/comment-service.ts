import { EventBus } from "../event-bus";

export type Comment = { id: string; taskId: string; authorId: string; body: string; createdAt: string };

export class CommentService {
  private store: Map<string, Comment> = new Map();
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  // meta can include taskTitle, authorName, assigneeId
  create(comment: Comment, meta?: { taskTitle?: string; authorName?: string; assigneeId?: string }) {
    if (this.store.has(comment.id)) throw new Error('Comment exists');
    this.store.set(comment.id, comment);
    // publish event with data needed by notification service
    const payload = { commentId: comment.id, taskId: comment.taskId, taskTitle: meta?.taskTitle ?? '', authorId: comment.authorId, authorName: meta?.authorName ?? '', assigneeId: meta?.assigneeId };
    this.bus.publish('comment.added', payload);
    return comment;
  }

  getByTask(taskId: string) {
    return Array.from(this.store.values()).filter((c) => c.taskId === taskId);
  }

  getById(id: string) {
    return this.store.get(id) ?? null;
  }

  delete(id: string) {
    return this.store.delete(id);
  }
}
