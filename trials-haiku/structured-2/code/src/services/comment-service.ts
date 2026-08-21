/**
 * Comment Service - Manages task comments
 * Data ownership: Comment records (id, taskId, authorId, body, createdAt)
 * Events published:
 *   - comment.added: {commentId, taskId, taskTitle, authorId, authorName}
 */

import { EventBus } from "../event-bus.js";

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: number;
}

export class CommentService {
  private comments: Map<string, Comment> = new Map();
  private nextId = 1;

  constructor(private eventBus: EventBus) {}

  /**
   * Create a new comment
   */
  create(
    taskId: string,
    authorId: string,
    authorName: string,
    body: string,
    taskTitle: string
  ): Comment {
    const id = `comment_${this.nextId++}`;
    const comment: Comment = {
      id,
      taskId,
      authorId,
      body,
      createdAt: Date.now(),
    };
    this.comments.set(id, comment);

    // Publish event
    this.eventBus.publish("comment.added", {
      commentId: id,
      taskId,
      taskTitle,
      authorId,
      authorName,
    });

    return comment;
  }

  /**
   * Get comment by ID
   */
  getById(id: string): Comment | null {
    return this.comments.get(id) || null;
  }

  /**
   * Get all comments for a task
   */
  getByTask(taskId: string): Comment[] {
    return Array.from(this.comments.values()).filter(
      (comment) => comment.taskId === taskId
    );
  }

  /**
   * Delete comment
   */
  delete(id: string): boolean {
    return this.comments.delete(id);
  }
}
