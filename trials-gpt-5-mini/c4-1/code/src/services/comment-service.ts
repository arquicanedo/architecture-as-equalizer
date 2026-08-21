import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus.js';

export type Comment = {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export class CommentService {
  private store: Map<string, Comment> = new Map();
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  create(data: { taskId: string; authorId: string; body: string; taskTitle?: string; authorName?: string }): Comment {
    const id = randomUUID();
    const comment: Comment = { id, taskId: data.taskId, authorId: data.authorId, body: data.body, createdAt: new Date().toISOString() };
    this.store.set(id, comment);
    // publish event with some helpful context
    this.bus.publish('comment.added', { commentId: id, taskId: data.taskId, taskTitle: data.taskTitle ?? '', authorId: data.authorId, authorName: data.authorName ?? '' });
    return comment;
  }

  getById(id: string): Comment | null {
    return this.store.get(id) ?? null;
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.store.values()).filter((c) => c.taskId === taskId);
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }
}
