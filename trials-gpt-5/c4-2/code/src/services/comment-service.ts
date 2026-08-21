import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO 8601
}

export class CommentService {
  private store: Map<string, Comment> = new Map();
  constructor(private bus: EventBus) {}

  create(input: { taskId: string; authorId: string; body: string; taskTitle?: string; authorName?: string }): Comment {
    const comment: Comment = {
      id: randomUUID(),
      taskId: input.taskId,
      authorId: input.authorId,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    this.store.set(comment.id, comment);
    // Publish event for notifications. Title/name may not be known; router can enrich, but spec forbids service-to-service reads.
    this.bus.publish('comment.added', {
      commentId: comment.id,
      taskId: comment.taskId,
      taskTitle: input.taskTitle ?? '(unknown task)',
      authorId: comment.authorId,
      authorName: input.authorName ?? '(unknown user)'
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
