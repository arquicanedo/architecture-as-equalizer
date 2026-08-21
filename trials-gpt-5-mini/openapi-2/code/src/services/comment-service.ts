import { Comment, CreateCommentInput } from '../types';
import { eventBus } from '../event-bus';

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export class CommentService {
  private store: Map<string, Comment> = new Map();

  listByTask(taskId: string): Comment[] {
    return Array.from(this.store.values()).filter((c) => c.taskId === taskId);
  }

  create(input: CreateCommentInput, taskTitle: string, authorName: string): Comment {
    const id = genId();
    const c: Comment = { id, taskId: input.taskId, authorId: input.authorId, body: input.body, createdAt: new Date().toISOString() };
    this.store.set(id, c);
    eventBus.publish('comment.added', { commentId: id, taskId: input.taskId, taskTitle, authorId: input.authorId, authorName });
    return c;
  }

  get(id: string): Comment | null {
    return this.store.get(id) || null;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }
}
