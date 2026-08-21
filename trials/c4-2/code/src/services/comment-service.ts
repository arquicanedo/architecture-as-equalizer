/**
 * Comment Service — manages comments on tasks.
 * Owns the in-memory Comment store.
 * Publishes: comment.added
 * Subscribes: none
 */

import { randomUUID } from "crypto";
import { EventBus } from "../event-bus";

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface CommentAddedPayload {
  commentId: string;
  taskId: string;
  taskTitle: string;
  authorId: string;
  authorName: string;
  /** The assignee of the task at comment time; null if unassigned. Resolved by router. */
  taskAssigneeId: string | null;
  /** The comment body, used for notification text. */
  body: string;
}

export class CommentService {
  private store: Map<string, Comment> = new Map();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Creates a comment.
   * taskTitle, authorName, and taskAssigneeId must be resolved by the router
   * before calling, since services must not call each other directly.
   */
  create(data: {
    taskId: string;
    authorId: string;
    body: string;
    taskTitle: string;         // resolved by router
    authorName: string;        // resolved by router
    taskAssigneeId: string | null; // resolved by router
  }): Comment {
    if (!data.taskId) throw new Error("taskId is required");
    if (!data.authorId) throw new Error("authorId is required");
    if (!data.body) throw new Error("body is required");

    const comment: Comment = {
      id: randomUUID(),
      taskId: data.taskId,
      authorId: data.authorId,
      body: data.body,
      createdAt: new Date().toISOString(),
    };
    this.store.set(comment.id, comment);

    const payload: CommentAddedPayload = {
      commentId: comment.id,
      taskId: data.taskId,
      taskTitle: data.taskTitle,
      authorId: data.authorId,
      authorName: data.authorName,
      taskAssigneeId: data.taskAssigneeId,
      body: data.body,
    };
    this.eventBus.publish("comment.added", payload);

    return comment;
  }

  getById(id: string): Comment {
    const comment = this.store.get(id);
    if (!comment) throw new Error(`Comment not found: ${id}`);
    return comment;
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.store.values()).filter(
      (c) => c.taskId === taskId
    );
  }

  delete(id: string): void {
    if (!this.store.has(id)) throw new Error(`Comment not found: ${id}`);
    this.store.delete(id);
  }
}
