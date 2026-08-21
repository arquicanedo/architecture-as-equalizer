/**
 * Comment Service - Manages comments on tasks
 */

import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  text: string;
  createdAt: number;
}

export class CommentService {
  private comments: Map<string, Comment> = new Map();

  constructor(private eventBus: EventBus) {}

  /**
   * Create a new comment
   */
  createComment(taskId: string, authorId: string, text: string): Comment {
    const comment: Comment = {
      id: randomUUID(),
      taskId,
      authorId,
      text,
      createdAt: Date.now(),
    };
    this.comments.set(comment.id, comment);

    // Publish event for notification service
    this.eventBus.publish('comment.added', {
      commentId: comment.id,
      taskId,
      authorId,
      text,
    });

    return comment;
  }

  /**
   * Get a comment by ID
   */
  getComment(id: string): Comment | null {
    return this.comments.get(id) || null;
  }

  /**
   * Get all comments
   */
  getAllComments(): Comment[] {
    return Array.from(this.comments.values());
  }

  /**
   * Get comments for a specific task
   */
  getCommentsByTask(taskId: string): Comment[] {
    return Array.from(this.comments.values()).filter(
      (comment) => comment.taskId === taskId
    );
  }

  /**
   * Delete a comment
   */
  deleteComment(id: string): boolean {
    return this.comments.delete(id);
  }
}
