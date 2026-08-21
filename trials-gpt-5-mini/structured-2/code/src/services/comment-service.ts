import { EventBus } from "../event-bus";

export type Comment = { id: string; taskId: string; authorId: string; body: string; createdAt: string };

export class CommentService {
  private store: Map<string, Comment> = new Map();
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  create(comment: Comment, taskTitle?: string, authorName?: string): Comment {
    if (this.store.has(comment.id)) throw new Error('Comment exists');
    this.store.set(comment.id, comment);
    this.bus.publish('comment.added', { commentId: comment.id, taskId: comment.taskId, taskTitle: taskTitle ?? null, authorId: comment.authorId, authorName: authorName ?? null });
    return comment;
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
