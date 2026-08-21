import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

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
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  listCommentsByTask(taskId: string): Comment[] {
    return Array.from(this.comments.values()).filter(c => c.taskId === taskId);
  }

  createComment(input: CreateCommentInput, context?: { taskTitle?: string; authorName?: string }): Comment {
    const comment: Comment = {
      id: randomUUID(),
      taskId: input.taskId,
      authorId: input.authorId,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    this.comments.set(comment.id, comment);
    // Publish event for notifications. We rely on router to enrich context.
    this.bus.publish('comment.added', {
      commentId: comment.id,
      taskId: comment.taskId,
      taskTitle: context?.taskTitle || 'Task',
      authorId: comment.authorId,
      authorName: context?.authorName || 'User',
    });
    return comment;
  }

  getComment(id: string): Comment | undefined {
    return this.comments.get(id);
  }

  deleteComment(id: string): boolean {
    return this.comments.delete(id);
  }
}
