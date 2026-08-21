import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: number;
}

export class CommentService {
  private comments: Map<string, Comment> = new Map();
  constructor(private bus: EventBus) {}

  create(data: { taskId: string; authorId: string; body: string; taskTitle?: string; authorName?: string; assigneeId?: string }): Comment {
    const id = randomUUID();
    const comment: Comment = { id, taskId: data.taskId, authorId: data.authorId, body: data.body, createdAt: Date.now() };
    this.comments.set(id, comment);
    this.bus.publish('comment.added', { commentId: id, taskId: comment.taskId, taskTitle: data.taskTitle, authorId: comment.authorId, authorName: data.authorName, assigneeId: data.assigneeId });
    return comment;
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.comments.values()).filter((c) => c.taskId === taskId);
  }

  getById(id: string): Comment | undefined {
    return this.comments.get(id);
  }

  delete(id: string): boolean {
    return this.comments.delete(id);
  }
}
