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
  private comments: Map<string, Comment> = new Map();

  constructor(private bus: EventBus) {}

  create(taskId: string, authorId: string, body: string): Comment {
    const id = randomUUID();
    const comment: Comment = { id, taskId, authorId, body, createdAt: Date.now() };
    this.comments.set(id, comment);
    this.bus.emit('comment.added', { commentId: id, taskId, authorId });
    return comment;
  }

  list(filter?: { taskId?: string }): Comment[] {
    let list = Array.from(this.comments.values());
    if (filter?.taskId) list = list.filter((c) => c.taskId === filter.taskId);
    return list.sort((a, b) => a.createdAt - b.createdAt);
  }

  get(id: string): Comment | undefined {
    return this.comments.get(id);
  }

  delete(id: string): boolean {
    const existed = this.comments.delete(id);
    if (existed) this.bus.emit('comment.deleted', { commentId: id });
    return existed;
  }
}
