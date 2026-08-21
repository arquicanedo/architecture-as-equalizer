import { randomUUID } from 'crypto';
import { Comment, CreateCommentDTO } from './types';
import { EventBus } from './event-bus';

export class CommentService {
  private comments: Map<string, Comment> = new Map();

  constructor(private readonly eventBus: EventBus) {}

  /**
   * Add a comment to a task.
   * The caller (router) is responsible for supplying the task's current
   * assigneeId so the event payload can carry it for notification purposes.
   */
  createComment(
    dto: CreateCommentDTO,
    taskTitle: string,
    assigneeId: string | null
  ): Comment {
    if (!dto.taskId) throw new Error('Comment taskId is required.');
    if (!dto.authorId) throw new Error('Comment authorId is required.');
    if (!dto.body || dto.body.trim() === '') {
      throw new Error('Comment body is required.');
    }

    const comment: Comment = {
      id: randomUUID(),
      taskId: dto.taskId,
      authorId: dto.authorId,
      body: dto.body.trim(),
      createdAt: new Date().toISOString(),
    };
    this.comments.set(comment.id, comment);

    this.eventBus.publish('comment.added', {
      commentId: comment.id,
      taskId: comment.taskId,
      taskTitle,
      authorId: comment.authorId,
      assigneeId,
      body: comment.body,
    });

    return comment;
  }

  /** Return all comments, optionally filtered by taskId. */
  listComments(taskId?: string): Comment[] {
    const all = Array.from(this.comments.values());
    return taskId ? all.filter((c) => c.taskId === taskId) : all;
  }

  /** Return a single comment by ID, or undefined if not found. */
  getCommentById(id: string): Comment | undefined {
    return this.comments.get(id);
  }

  /** Delete a comment by ID. Throws if not found. */
  deleteComment(id: string): void {
    if (!this.comments.has(id)) throw new Error(`Comment "${id}" not found.`);
    this.comments.delete(id);
  }
}
