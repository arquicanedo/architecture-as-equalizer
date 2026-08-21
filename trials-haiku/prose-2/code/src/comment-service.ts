/**
 * Comment Service - manages comments on tasks
 */

import { eventBus } from './event-bus.js';

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  text: string;
  timestamp: number;
}

export class CommentService {
  private comments: Map<string, Comment> = new Map();
  private nextId: number = 1;

  /**
   * Create a new comment
   */
  createComment(taskId: string, authorId: string, text: string): Comment {
    const id = `comment-${this.nextId++}`;
    const comment: Comment = {
      id,
      taskId,
      authorId,
      text,
      timestamp: Date.now(),
    };
    this.comments.set(id, comment);

    // Publish event for notification service
    eventBus.publish('comment.added', {
      commentId: id,
      taskId,
      authorId,
      text,
      timestamp: comment.timestamp,
    });

    return comment;
  }

  /**
   * Get a comment by ID
   */
  getComment(commentId: string): Comment | undefined {
    return this.comments.get(commentId);
  }

  /**
   * Get all comments (optionally filtered by task)
   */
  getAllComments(taskId?: string): Comment[] {
    const allComments = Array.from(this.comments.values());
    if (taskId) {
      return allComments.filter(comment => comment.taskId === taskId);
    }
    return allComments;
  }

  /**
   * Delete a comment
   */
  deleteComment(commentId: string): boolean {
    return this.comments.delete(commentId);
  }

  /**
   * Check if a comment exists
   */
  commentExists(commentId: string): boolean {
    return this.comments.has(commentId);
  }
}

export const commentService = new CommentService();
