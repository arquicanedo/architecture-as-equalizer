/**
 * Comment Service — manages comments on tasks.
 * Owns its own in-memory store.
 *
 * Events published:
 *   comment.added → { commentId, taskId, taskTitle, authorId, authorName, taskAssigneeId }
 *
 * The router resolves taskTitle, authorName, and taskAssigneeId by consulting
 * TaskService and UserService before calling create(), so the comment service
 * never calls those services directly — preserving service isolation.
 */

import { randomUUID } from "crypto";
import { eventBus, EventBus } from "../event-bus.js";

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO 8601
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class CommentNotFoundError extends Error {
  constructor(id: string) {
    super(`Comment not found: ${id}`);
    this.name = "CommentNotFoundError";
  }
}

export class CommentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommentValidationError";
  }
}

// ---------------------------------------------------------------------------
// Input type
// ---------------------------------------------------------------------------

export interface CreateCommentInput {
  taskId: string;
  authorId: string;
  body: string;
  /** Resolved by the router from TaskService — not stored, only forwarded in the event. */
  taskTitle: string;
  /** Resolved by the router from UserService — not stored, only forwarded in the event. */
  authorName: string;
  /** Resolved by the router from TaskService — not stored, only forwarded in the event. */
  taskAssigneeId: string | null;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class CommentService {
  /** Service-owned store — no other service may access this directly. */
  private store: Map<string, Comment> = new Map();
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  create(data: CreateCommentInput): Comment {
    if (!data.taskId?.trim()) {
      throw new CommentValidationError("taskId is required");
    }
    if (!data.authorId?.trim()) {
      throw new CommentValidationError("authorId is required");
    }
    if (!data.body?.trim()) {
      throw new CommentValidationError("body is required");
    }

    const comment: Comment = {
      id: randomUUID(),
      taskId: data.taskId.trim(),
      authorId: data.authorId.trim(),
      body: data.body.trim(),
      createdAt: new Date().toISOString(),
    };

    this.store.set(comment.id, comment);

    this.bus.publish("comment.added", {
      commentId: comment.id,
      taskId: comment.taskId,
      taskTitle: data.taskTitle,
      authorId: comment.authorId,
      authorName: data.authorName,
      taskAssigneeId: data.taskAssigneeId,
    });

    return comment;
  }

  getById(id: string): Comment {
    const comment = this.store.get(id);
    if (!comment) throw new CommentNotFoundError(id);
    return comment;
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.store.values()).filter(
      (c) => c.taskId === taskId
    );
  }

  delete(id: string): void {
    if (!this.store.has(id)) throw new CommentNotFoundError(id);
    this.store.delete(id);
  }
}

/** Singleton instance exported for use in the router. */
export const commentService = new CommentService(eventBus);
