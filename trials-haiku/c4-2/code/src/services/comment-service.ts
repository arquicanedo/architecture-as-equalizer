/**
 * Comment Service
 * Manages comments on tasks
 */

import { randomUUID } from "crypto";
import { eventBus } from "../event-bus.js";

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface CreateCommentInput {
  taskId: string;
  authorId: string;
  body: string;
  taskTitle?: string;
}

export class CommentService {
  private commentStore: Map<string, Comment> = new Map();

  /**
   * Create a new comment
   */
  create(input: CreateCommentInput): Comment {
    const comment: Comment = {
      id: randomUUID(),
      taskId: input.taskId,
      authorId: input.authorId,
      body: input.body,
      createdAt: new Date().toISOString(),
    };

    this.commentStore.set(comment.id, comment);

    // Publish event
    eventBus.publish("comment.added", {
      commentId: comment.id,
      taskId: comment.taskId,
      taskTitle: input.taskTitle || "Unknown Task",
      authorId: comment.authorId,
      authorName: comment.authorId, // Will be resolved by caller
    });

    return comment;
  }

  /**
   * Get comment by ID
   */
  getById(id: string): Comment | null {
    return this.commentStore.get(id) || null;
  }

  /**
   * Get comments by task
   */
  getByTask(taskId: string): Comment[] {
    return Array.from(this.commentStore.values()).filter(
      (comment) => comment.taskId === taskId
    );
  }

  /**
   * Delete comment
   */
  delete(id: string): boolean {
    return this.commentStore.delete(id);
  }
}

export const commentService = new CommentService();
