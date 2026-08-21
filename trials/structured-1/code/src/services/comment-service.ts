/**
 * Comment Service — owns all comment data.
 * Publishes "comment.added" via the Event Bus.
 *
 * The router enriches the create() input with taskTitle, authorName, and
 * taskAssigneeId (resolved by looking up the task and user) so this service
 * can publish a fully-formed event payload without importing other services
 * (ADR-001, ADR-002).
 */

import { randomUUID } from "crypto";
import { EventBus } from "../event-bus.js";
import { ApiError } from "../errors.js";

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
  /** Resolved by the router from TaskService. Used for the event payload only. */
  taskTitle: string;
  /** Resolved by the router from UserService. Used for the event payload only. */
  authorName: string;
  /**
   * Resolved by the router from TaskService. Forwarded in the event so
   * NotificationService knows whom to notify without calling TaskService.
   * null when the task has no assignee.
   */
  taskAssigneeId: string | null;
}

export interface CommentAddedPayload {
  commentId: string;
  taskId: string;
  taskTitle: string;
  authorId: string;
  authorName: string;
  /** Present so NotificationService can resolve the notification recipient. */
  taskAssigneeId: string | null;
}

export class CommentService {
  private readonly store = new Map<string, Comment>();
  private readonly bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  create(input: CreateCommentInput): Comment {
    if (!input.taskId) throw new ApiError("taskId is required", 400);
    if (!input.authorId) throw new ApiError("authorId is required", 400);
    if (!input.body || !input.body.trim()) throw new ApiError("body is required", 400);

    const comment: Comment = {
      id: randomUUID(),
      taskId: input.taskId,
      authorId: input.authorId,
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
      taskAssigneeId: input.taskAssigneeId,
    };
    this.bus.publish("comment.added", payload);

    return comment;
  }

  getById(id: string): Comment {
    const comment = this.store.get(id);
    if (!comment) throw new ApiError(`Comment not found: ${id}`, 404);
    return comment;
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.store.values())
      .filter((c) => c.taskId === taskId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  delete(id: string): void {
    if (!this.store.has(id)) throw new ApiError(`Comment not found: ${id}`, 404);
    this.store.delete(id);
  }
}
