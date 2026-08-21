import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export class CommentService {
  private store: Map<string, Comment> = new Map();
  constructor(private eventBus: EventBus) {}

  create(data: { taskId: string; authorId: string; body: string; authorName?: string; taskTitle?: string; assigneeId?: string | null }): Comment {
    const comment: Comment = {
      id: randomUUID(),
      taskId: data.taskId,
      authorId: data.authorId,
      body: data.body,
      createdAt: new Date().toISOString(),
    };
    this.store.set(comment.id, comment);
    this.eventBus.publish('comment.added', { commentId: comment.id, taskId: comment.taskId, taskTitle: data.taskTitle ?? '', authorId: comment.authorId, authorName: data.authorName ?? '', assigneeId: data.assigneeId });
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
