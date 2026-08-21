import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO 8601
}

export class CommentService {
  private store: Map<string, Comment> = new Map();

  constructor(private eventBus: EventBus, private getTaskTitle: (taskId: string) => string | undefined, private getUserName: (userId: string) => string | undefined) {}

  create(input: Omit<Comment, 'id' | 'createdAt'>): Comment {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const comment: Comment = { id, ...input, createdAt };
    this.store.set(id, comment);

    // publish event on comment added
    const taskTitle = this.getTaskTitle(input.taskId) || 'Task';
    const authorName = this.getUserName(input.authorId) || 'Someone';
    this.eventBus.publish('comment.added', {
      commentId: id,
      taskId: input.taskId,
      taskTitle,
      authorId: input.authorId,
      authorName,
    });

    return comment;
  }

  getById(id: string): Comment | undefined {
    return this.store.get(id);
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.store.values()).filter((c) => c.taskId === taskId);
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }
}
