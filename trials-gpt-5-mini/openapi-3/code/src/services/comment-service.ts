import { Comment, ID } from '../types';
import { eventBus } from '../event-bus';

export class CommentService {
  private store: Map<ID, Comment> = new Map();

  listByTask(taskId: ID): Comment[] {
    return Array.from(this.store.values()).filter((c) => c.taskId === taskId);
  }

  create(input: { taskId: ID; authorId: ID; body: string; authorName?: string; taskTitle?: string }): Comment {
    const id = Math.random().toString(36).slice(2, 9);
    const createdAt = new Date().toISOString();
    const comment: Comment = { id, taskId: input.taskId, authorId: input.authorId, body: input.body, createdAt };
    this.store.set(id, comment);
    // publish comment.added
    eventBus.publish('comment.added', {
      commentId: id,
      taskId: input.taskId,
      taskTitle: input.taskTitle ?? 'unknown',
      authorId: input.authorId,
      authorName: input.authorName ?? 'unknown',
    });
    return comment;
  }

  get(id: ID): Comment | null {
    return this.store.get(id) ?? null;
  }

  delete(id: ID): boolean {
    return this.store.delete(id);
  }
}

export const commentService = new CommentService();
