import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: number; // timestamp ms
}

export class CommentService {
  private comments: Map<string, Comment> = new Map();

  constructor(private bus: EventBus) {}

  create(taskId: string, authorId: string, body: string): Comment {
    const comment: Comment = { id: randomUUID(), taskId, authorId, body, createdAt: Date.now() };
    this.comments.set(comment.id, comment);
    this.bus.publish('comment.added', { comment });
    return comment;
  }

  list(filter?: { taskId?: string }): Comment[] {
    let out = Array.from(this.comments.values());
    if (filter?.taskId) {
      out = out.filter(c => c.taskId === filter.taskId);
    }
    return out.sort((a, b) => a.createdAt - b.createdAt);
  }

  get(id: string): Comment | undefined {
    return this.comments.get(id);
  }

  delete(id: string): boolean {
    return this.comments.delete(id);
  }
}
