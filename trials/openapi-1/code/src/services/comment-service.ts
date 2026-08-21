// ============================================================
// Comment Service
// Owns the in-memory comment store.
// Publishes events to the Event Bus; never imports other services.
//
// NOTE: The router passes taskTitle and authorName when calling
// createComment so that this service can publish a rich event
// without querying other services directly.
// ============================================================

import { randomUUID } from 'crypto';
import {
  Comment,
  CreateCommentInput,
  ServiceResult,
  ok,
  fail,
} from '../types.js';
import { eventBus, Events, CommentAddedPayload } from '../event-bus.js';

// Extended input accepted internally (router enriches the raw HTTP body).
export interface EnrichedCreateCommentInput extends CreateCommentInput {
  taskTitle: string;
  authorName: string;
}

class CommentService {
  private readonly store = new Map<string, Comment>();

  listByTask(taskId: string): ServiceResult<Comment[]> {
    const comments = Array.from(this.store.values())
      .filter((c) => c.taskId === taskId)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    return ok(comments);
  }

  getComment(id: string): ServiceResult<Comment> {
    const comment = this.store.get(id);
    if (!comment) return fail(404, `Comment "${id}" not found`);
    return ok(comment);
  }

  createComment(input: EnrichedCreateCommentInput): ServiceResult<Comment> {
    if (!input.taskId?.trim()) return fail(400, 'Field "taskId" is required');
    if (!input.authorId?.trim())
      return fail(400, 'Field "authorId" is required');
    if (!input.body?.trim()) return fail(400, 'Field "body" is required');

    const comment: Comment = {
      id: randomUUID(),
      taskId: input.taskId.trim(),
      authorId: input.authorId.trim(),
      body: input.body.trim(),
      createdAt: new Date().toISOString(),
    };
    this.store.set(comment.id, comment);

    const payload: CommentAddedPayload = {
      commentId: comment.id,
      taskId: comment.taskId,
      taskTitle: input.taskTitle,
      authorId: comment.authorId,
      authorName: input.authorName,
    };
    eventBus.publish(Events.COMMENT_ADDED, payload);

    return ok(comment);
  }

  deleteComment(id: string): ServiceResult<void> {
    if (!this.store.has(id)) return fail(404, `Comment "${id}" not found`);
    this.store.delete(id);
    return ok(undefined);
  }
}

export const commentService = new CommentService();
