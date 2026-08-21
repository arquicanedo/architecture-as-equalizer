/**
 * Comment Service
 * Owns the comment data store.
 * Publishes: comment.added
 * Subscribes to no events.
 *
 * NOTE: To publish comment.added with taskTitle and authorName, the router
 * must pass those enriched values in at call time — the service itself does
 * NOT reach into other services' stores (per ADR-002).
 */

import { randomUUID } from "crypto";
import { EventBus } from "../event-bus";

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO 8601
}

export type CreateCommentInput = {
  taskId: string;
  authorId: string;
  body: string;
  /** Enriched fields supplied by the router for the event payload */
  taskTitle: string;
  authorName: string;
};

export interface CommentAddedPayload {
  commentId: string;
  taskId: string;
  taskTitle: string;
  authorId: string;
  authorName: string;
}

export class CommentService {
  private store: Map<string, Comment> = new Map();

  constructor(private readonly eventBus: EventBus) {}

  create(input: CreateCommentInput): Comment {
    if (!input.taskId) throw new Error("taskId is required");
    if (!input.authorId) throw new Error("authorId is required");
    if (!input.body) throw new Error("body is required");

    const comment: Comment = {
      id: randomUUID(),
      taskId: input.taskId,
      authorId: input.authorId,
      body: input.body,
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
    this.eventBus.publish("comment.added", payload);

    return comment;
  }

  getById(id: string): Comment {
    const comment = this.store.get(id);
    if (!comment) {
      throw new Error(`Comment not found: ${id}`);
    }
    return comment;
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.store.values()).filter(
      (c) => c.taskId === taskId
    );
  }

  delete(id: string): void {
    if (!this.store.has(id)) {
      throw new Error(`Comment not found: ${id}`);
    }
    this.store.delete(id);
  }
}
