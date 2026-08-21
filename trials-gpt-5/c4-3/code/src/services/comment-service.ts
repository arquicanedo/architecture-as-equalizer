import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO
}

export class CommentService {
  private comments: Map<string, Comment> = new Map();
  constructor(private eventBus: EventBus) {}

  create(input: {
    taskId: string;
    authorId: string;
    body: string;
    taskTitle?: string;
    authorName?: string;
    assigneeId?: string | null;
  }): Comment {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const comment: Comment = {
      id,
      taskId: input.taskId,
      authorId: input.authorId,
      body: input.body,
      createdAt,
    };
    this.comments.set(id, comment);

    this.eventBus.publish('comment.added', {
      commentId: comment.id,
      taskId: comment.taskId,
      taskTitle: input.taskTitle ?? '',
      authorId: comment.authorId,
      authorName: input.authorName ?? '',
      assigneeId: input.assigneeId ?? undefined,
    });

    return comment;
  }

  getById(id: string): Comment | undefined {
    return this.comments.get(id);
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.comments.values()).filter((c) => c.taskId === taskId);
  }

  delete(id: string): boolean {
    return this.comments.delete(id);
  }
}
