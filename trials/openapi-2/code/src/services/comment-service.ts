import { randomUUID } from "crypto";
import {
  eventBus,
  EVENT_COMMENT_ADDED,
  CommentAddedPayload,
} from "../event-bus.js";

// ── Domain types ────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO 8601
}

export interface CreateCommentInput {
  taskId: string;
  authorId: string;
  body: string;
  /** Resolved by the router before calling the service. */
  taskTitle: string;
  /** Resolved by the router before calling the service. */
  authorName: string;
}

// ── Service ─────────────────────────────────────────────────────────────────

export class CommentService {
  /** Owned data store — no other service may access this. */
  private store: Map<string, Comment> = new Map();

  listByTask(taskId: string): Comment[] {
    return Array.from(this.store.values()).filter(
      (c) => c.taskId === taskId
    );
  }

  getById(id: string): Comment | undefined {
    return this.store.get(id);
  }

  create(input: CreateCommentInput): Comment {
    if (!input.taskId) throw new Error("Comment taskId is required.");
    if (!input.authorId) throw new Error("Comment authorId is required.");
    if (!input.body || input.body.trim() === "") {
      throw new Error("Comment body is required.");
    }

    const comment: Comment = {
      id: randomUUID(),
      taskId: input.taskId,
      authorId: input.authorId,
      body: input.body.trim(),
      createdAt: new Date().toISOString(),
    };

    this.store.set(comment.id, comment);

    // Publish event — NotificationService subscribes
    const payload: CommentAddedPayload = {
      commentId: comment.id,
      taskId: comment.taskId,
      taskTitle: input.taskTitle,
      authorId: comment.authorId,
      authorName: input.authorName,
    };
    eventBus.publish(EVENT_COMMENT_ADDED, payload);

    return comment;
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }
}
