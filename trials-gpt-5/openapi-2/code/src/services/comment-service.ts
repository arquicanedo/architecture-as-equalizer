import { randomUUID } from 'crypto';
import { eventBus } from '../event-bus';

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO string
}

export interface CreateCommentInput {
  taskId: string;
  authorId: string;
  body: string;
}

export class CommentService {
  private comments: Map<string, Comment> = new Map();

  listByTask(taskId: string): Comment[] {
    return Array.from(this.comments.values()).filter(c => c.taskId === taskId);
  }

  create(input: CreateCommentInput, taskTitle?: string, authorName?: string): Comment {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const comment: Comment = { id, taskId: input.taskId, authorId: input.authorId, body: input.body, createdAt };
    this.comments.set(id, comment);

    // publish event for notification service. Note: Since services cannot call each other, we accept optional metadata (taskTitle, authorName)
    eventBus.publish('comment.added', {
      commentId: id,
      taskId: input.taskId,
      taskTitle: taskTitle ?? 'Unknown Task',
      authorId: input.authorId,
      authorName: authorName ?? 'Unknown User',
    });

    return comment;
  }

  get(id: string): Comment | undefined {
    return this.comments.get(id);
  }

  delete(id: string): boolean {
    return this.comments.delete(id);
  }
}
