/**
 * Comment Service — manages comments on tasks.
 * Owns its own in-memory data store (Map<string, Comment>).
 *
 * Events published:
 *   comment.added  { commentId, taskId, taskTitle, authorId, authorName, assigneeId }
 *
 * `taskTitle`, `authorName`, and `assigneeId` are supplied by the router at
 * call time so this service never imports or calls other services directly
 * (enforces ADR-001 / ADR-002).  The `assigneeId` is forwarded in the event
 * payload so that NotificationService can notify the task assignee without
 * ever reaching into TaskService's store.
 */

import { randomUUID } from "crypto";
import { EventBus } from "../event-bus.js";

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export class CommentService {
  private store: Map<string, Comment> = new Map();

  constructor(private eventBus: EventBus) {}

  /**
   * Create a comment and publish a `comment.added` event.
   *
   * @param taskId     - ID of the task being commented on
   * @param authorId   - ID of the user writing the comment
   * @param body       - Comment text
   * @param taskTitle  - Title of the task (resolved by the router)
   * @param authorName - Display name of the author (resolved by the router)
   * @param assigneeId - Current assignee of the task, if any (resolved by the router)
   */
  create(
    taskId: string,
    authorId: string,
    body: string,
    taskTitle: string,
    authorName: string,
    assigneeId: string | null = null
  ): Comment {
    if (!taskId || !authorId || !body) {
      throw new Error("taskId, authorId, and body are required");
    }
    const comment: Comment = {
      id: randomUUID(),
      taskId,
      authorId,
      body,
      createdAt: new Date().toISOString(),
    };
    this.store.set(comment.id, comment);

    this.eventBus.publish("comment.added", {
      commentId: comment.id,
      taskId,
      taskTitle,
      authorId,
      authorName,
      assigneeId, // forwarded to NotificationService via the event payload
    });

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
