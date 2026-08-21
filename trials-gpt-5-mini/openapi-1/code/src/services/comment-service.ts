import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface CreateCommentInput {
  taskId: string;
  authorId: string;
  body: string;
}

export class CommentService {
  private store: Map<string, Comment> = new Map();
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  listByTask(taskId: string): Comment[] {
    return Array.from(this.store.values()).filter((c) => c.taskId === taskId);
  }

  create(input: CreateCommentInput, authorName?: string, taskTitle?: string): Comment {
    const id = randomUUID();
    const now = new Date().toISOString();
    const comment: Comment = { id, taskId: input.taskId, authorId: input.authorId, body: input.body, createdAt: now };
    this.store.set(id, comment);
    // publish event
    this.bus.publish('comment.added', { commentId: id, taskId: input.taskId, taskTitle: taskTitle ?? '', authorId: input.authorId, authorName: authorName ?? '' });
    return comment;
  }

  get(id: string): Comment | null {
    return this.store.get(id) ?? null;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }
}
