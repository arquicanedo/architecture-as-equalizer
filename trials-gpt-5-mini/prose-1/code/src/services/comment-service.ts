import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export type Comment = {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO
};

export class CommentService {
  private comments: Map<string, Comment> = new Map();
  constructor(private eventBus: EventBus) {}

  addComment(taskId: string, authorId: string, body: string): Comment {
    const id = randomUUID();
    const c: Comment = { id, taskId, authorId, body, createdAt: new Date().toISOString() };
    this.comments.set(id, c);
    this.eventBus.publish('comment.added', { comment: c });
    return c;
  }

  getComment(id: string): Comment | undefined {
    return this.comments.get(id);
  }

  deleteComment(id: string): boolean {
    const c = this.comments.get(id);
    if (!c) return false;
    this.comments.delete(id);
    this.eventBus.publish('comment.deleted', { comment: c });
    return true;
  }

  listComments(filter?: { taskId?: string }): Comment[] {
    let res = Array.from(this.comments.values());
    if (filter?.taskId) res = res.filter((c) => c.taskId === filter.taskId);
    return res;
  }
}
