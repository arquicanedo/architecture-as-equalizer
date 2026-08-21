import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: number; // epoch ms
}

export class CommentService {
  private store: Map<string, Comment> = new Map();
  // For publishing taskTitle and authorName, the CommentService must not call other services.
  // Therefore, router can pass in minimal lookup functions at creation, or we send only IDs.
  // Per spec, CommentService publishes: { commentId, taskId, taskTitle, authorId, authorName }.
  // To respect constraints, we accept provider callbacks for resolving names at event time from the router layer.
  constructor(private bus: EventBus, private providers: { getTaskTitle: (taskId: string) => string | undefined; getUserName: (userId: string) => string | undefined }) {}

  create(input: { taskId: string; authorId: string; body: string }): Comment {
    const comment: Comment = {
      id: randomUUID(),
      taskId: input.taskId,
      authorId: input.authorId,
      body: input.body,
      createdAt: Date.now(),
    };
    this.store.set(comment.id, comment);
    const taskTitle = this.providers.getTaskTitle(comment.taskId);
    const authorName = this.providers.getUserName(comment.authorId);
    this.bus.publish('comment.added', {
      commentId: comment.id,
      taskId: comment.taskId,
      taskTitle,
      authorId: comment.authorId,
      authorName,
    });
    return comment;
  }

  getById(id: string): Comment | undefined {
    return this.store.get(id);
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.store.values()).filter((c) => c.taskId === taskId);
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }
}
