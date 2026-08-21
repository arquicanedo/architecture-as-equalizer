/**
 * CommentService — owns all comment data.
 *
 * Comments belong to tasks.  When a comment is created the service
 * publishes a "comment.added" event so the NotificationService can
 * alert the task's assignee without any direct coupling.
 *
 * Note: resolving the task's current assignee is done by the router
 * (which has access to the TaskService) before calling createComment,
 * and is passed in as part of the input so this service stays decoupled.
 */

import { randomUUID } from "crypto";
import type { EventBus } from "../event-bus.js";
import type {
  Comment,
  CreateCommentInput,
  CommentAddedPayload,
} from "../types.js";

/** Extended input that carries runtime context the event needs. */
export interface CreateCommentContext extends CreateCommentInput {
  taskTitle: string;
  assigneeId: string | null;
}

export class CommentService {
  private readonly comments: Map<string, Comment> = new Map();

  constructor(private readonly eventBus: EventBus) {}

  // ── Create ────────────────────────────────────────────────────────────────

  createComment(ctx: CreateCommentContext): Comment {
    if (!ctx.taskId) throw new Error("Comment taskId is required.");
    if (!ctx.authorId) throw new Error("Comment authorId is required.");
    if (!ctx.body || ctx.body.trim() === "") {
      throw new Error("Comment body is required.");
    }

    const comment: Comment = {
      id: randomUUID(),
      taskId: ctx.taskId,
      authorId: ctx.authorId,
      body: ctx.body.trim(),
      createdAt: new Date().toISOString(),
    };

    this.comments.set(comment.id, comment);

    const payload: CommentAddedPayload = {
      commentId: comment.id,
      taskId: comment.taskId,
      taskTitle: ctx.taskTitle,
      authorId: comment.authorId,
      assigneeId: ctx.assigneeId,
      body: comment.body,
    };
    this.eventBus.publish("comment.added", payload);

    return comment;
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  getComment(id: string): Comment {
    const comment = this.comments.get(id);
    if (!comment) throw new Error(`Comment "${id}" not found.`);
    return comment;
  }

  /**
   * List all comments, optionally filtered by taskId.
   * Results are sorted oldest-first.
   */
  listComments(taskId?: string): Comment[] {
    const all = [...this.comments.values()];
    const filtered = taskId ? all.filter((c) => c.taskId === taskId) : all;
    return filtered.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  deleteComment(id: string): void {
    if (!this.comments.has(id)) throw new Error(`Comment "${id}" not found.`);
    this.comments.delete(id);
  }

  /** Remove all comments for a task (called when the task is deleted). */
  deleteCommentsByTask(taskId: string): void {
    for (const [id, comment] of this.comments) {
      if (comment.taskId === taskId) this.comments.delete(id);
    }
  }
}
