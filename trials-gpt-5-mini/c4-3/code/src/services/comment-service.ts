import { Comment, UUID } from '../types';
import { uuid } from '../utils';
import { EventBus } from '../event-bus';

export class CommentService {
  private store: Map<UUID, Comment> = new Map();
  constructor(private bus: EventBus) {}

  create(payload: { taskId: string; authorId: string; body: string; authorName?: string; taskTitle?: string; assigneeId?: string | null }): Comment {
    const id = uuid();
    const c: Comment = { id, taskId: payload.taskId, authorId: payload.authorId, body: payload.body, createdAt: new Date().toISOString() };
    this.store.set(id, c);
    // publish event with authorName and taskTitle if provided
    this.bus.publish('comment.added', { commentId: id, taskId: payload.taskId, taskTitle: payload.taskTitle ?? '', authorId: payload.authorId, authorName: payload.authorName ?? '', assigneeId: payload.assigneeId });
    return c;
  }

  getById(id: UUID): Comment | null {
    return this.store.get(id) ?? null;
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.store.values()).filter(c => c.taskId === taskId);
  }

  delete(id: UUID): boolean {
    return this.store.delete(id);
  }
}
