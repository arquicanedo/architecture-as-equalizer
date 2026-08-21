import { Comment, ID } from '../types';
import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export class CommentService {
  private comments: Map<ID, Comment> = new Map();
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  addComment(taskId: ID, authorId: ID, body: string): Comment {
    const id = randomUUID();
    const now = new Date().toISOString();
    const c: Comment = { id, taskId, authorId, body, createdAt: now };
    this.comments.set(id, c);
    this.bus.publish('comment.added', c);
    return c;
  }

  getComment(id: ID): Comment | undefined {
    return this.comments.get(id);
  }

  listComments(filter?: { taskId?: ID }): Comment[] {
    let arr = Array.from(this.comments.values());
    if (filter?.taskId) arr = arr.filter((c) => c.taskId === filter.taskId);
    return arr;
  }

  deleteComment(id: ID) {
    return this.comments.delete(id);
  }
}
