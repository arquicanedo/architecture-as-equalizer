/**
 * Comment Service
 * Owns the comment data store exclusively.
 * Data shape: { id, taskId, authorId, body, createdAt }
 *
 * Publishes:
 *   comment.added → { commentId, taskId, taskTitle, authorId, authorName, assigneeId }
 *
 * taskTitle, authorName, and assigneeId are resolved by the router and passed
 * in at creation time, keeping this service free of direct service-to-service
 * calls.  assigneeId is forwarded in the event payload so that
 * NotificationService can notify the task's current assignee.
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

export class CommentService {
  private store: Map<string, Comment> = new Map();

  constructor(private eventBus: EventBus) {}

  create(data: {
    taskId: string;
    authorId: string;
    body: string;
    /** Resolved by the router — forwarded in the event payload only */
    taskTitle: string;
    /** Resolved by the router — forwarded in the event payload only */
    authorName: string;
    /** Resolved by the router — forwarded in the event payload so
     *  NotificationService can notify the assignee */
    assigneeId: string | null;
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

    this.eventBus.publish("comment.added", {
      commentId: comment.id,
      taskId: data.taskId,
      taskTitle: data.taskTitle,
      authorId: data.authorId,
      authorName: data.authorName,
      assigneeId: data.assigneeId,
      // Include a snippet of the body so notification messages are richer
      body: data.body,
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
