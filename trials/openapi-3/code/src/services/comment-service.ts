import { randomUUID } from 'crypto';
import { eventBus } from '../event-bus.js';
import type { Comment, CreateCommentInput, CommentAddedPayload } from '../types.js';

// ─── Comment Service ──────────────────────────────────────────────────────────
// Owns the comment store exclusively. Publishes events to the Event Bus.
// Does NOT call other services directly.
//
// NOTE: The router is responsible for resolving cross-service data (e.g. task
// title, author name) before calling createComment, because services are
// forbidden from calling each other.

export interface CreateCommentEnriched extends CreateCommentInput {
  /** Task title resolved by the router before calling this service */
  taskTitle: string;
  /** Author display name resolved by the router before calling this service */
  authorName: string;
}

class CommentService {
  private store: Map<string, Comment> = new Map();

  listByTask(taskId: string): Comment[] {
    return Array.from(this.store.values()).filter((c) => c.taskId === taskId);
  }

  getComment(id: string): Comment | undefined {
    return this.store.get(id);
  }

  createComment(input: CreateCommentEnriched): Comment {
    const comment: Comment = {
      id: randomUUID(),
      taskId: input.taskId,
      authorId: input.authorId,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    this.store.set(comment.id, comment);

    // Publish event so NotificationService can react
    const payload: CommentAddedPayload = {
      commentId: comment.id,
      taskId: comment.taskId,
      taskTitle: input.taskTitle,
      authorId: comment.authorId,
      authorName: input.authorName,
    };
    eventBus.publish('comment.added', payload);

    return comment;
  }

  deleteComment(id: string): boolean {
    return this.store.delete(id);
  }
}

export const commentService = new CommentService();
