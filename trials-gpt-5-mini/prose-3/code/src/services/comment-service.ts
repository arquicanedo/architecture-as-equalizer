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

  constructor(private bus: EventBus) {}

  create(data: Omit<Comment, 'id' | 'createdAt'> & { id?: string }): Comment {
    const id = data.id ?? this.generateId();
    const createdAt = new Date().toISOString();
    const comment: Comment = { id, taskId: data.taskId, authorId: data.authorId, body: data.body, createdAt };
    this.comments.set(id, comment);
    this.bus.emit('comment.added', comment);
    return comment;
  }

  getAll(filter?: { taskId?: string }): Comment[] {
    let arr = Array.from(this.comments.values());
    if (filter?.taskId) arr = arr.filter((c) => c.taskId === filter.taskId);
    return arr;
  }

  getById(id: string): Comment | undefined {
    return this.comments.get(id);
  }

  delete(id: string): boolean {
    const existed = this.comments.delete(id);
    if (existed) this.bus.emit('comment.deleted', { id });
    return existed;
  }

  private generateId() {
    return Math.random().toString(36).slice(2, 9);
  }
}
