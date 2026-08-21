/**
 * Comment Service
 * Manages comments independently and publishes events
 */

import { eventBus } from '../event-bus';

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
}

export class CommentService {
  private store: Map<string, Comment> = new Map();
  private idCounter: number = 0;

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `comment_${++this.idCounter}`;
  }

  /**
   * List comments by task
   */
  listCommentsByTask(taskId: string): Comment[] {
    return Array.from(this.store.values()).filter(comment => comment.taskId === taskId);
  }

  /**
   * Get comment by ID
   */
  getComment(id: string): Comment | null {
    return this.store.get(id) || null;
  }

  /**
   * Create a new comment
   */
  createComment(input: CreateCommentInput, taskTitle: string, authorName: string): Comment {
    const comment: Comment = {
      id: this.generateId(),
      taskId: input.taskId,
      authorId: input.authorId,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    this.store.set(comment.id, comment);

    // Publish event
    eventBus.publish('comment.added', {
      commentId: comment.id,
      taskId: comment.taskId,
      taskTitle,
      authorId: comment.authorId,
      authorName,
    });

    return comment;
  }

  /**
   * Delete a comment
   */
  deleteComment(id: string): boolean {
    return this.store.delete(id);
  }
}

export const commentService = new CommentService();
