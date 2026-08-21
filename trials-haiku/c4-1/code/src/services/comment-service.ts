/**
 * Comment Service - Manages comments on tasks
 * Publishes: comment.added
 */

import { randomUUID } from 'crypto';
import { eventBus } from '../event-bus';

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface CreateCommentRequest {
  taskId: string;
  authorId: string;
  body: string;
}

export class CommentService {
  private commentStore: Map<string, Comment> = new Map();

  /**
   * Create a new comment
   */
  create(req: CreateCommentRequest, taskTitle: string): Comment {
    const comment: Comment = {
      id: randomUUID(),
      taskId: req.taskId,
      authorId: req.authorId,
      body: req.body,
      createdAt: new Date().toISOString(),
    };
    this.commentStore.set(comment.id, comment);

    // Publish comment.added event
    eventBus.publish('comment.added', {
      commentId: comment.id,
      taskId: req.taskId,
      taskTitle: taskTitle,
      authorId: req.authorId,
      authorName: req.authorId, // Note: should be author name, but we'll pass the ID here
    });

    return comment;
  }

  /**
   * Get a comment by ID
   */
  getById(id: string): Comment | undefined {
    return this.commentStore.get(id);
  }

  /**
   * Get all comments for a task
   */
  getByTask(taskId: string): Comment[] {
    return Array.from(this.commentStore.values()).filter(
      comment => comment.taskId === taskId
    );
  }

  /**
   * Delete a comment
   */
  delete(id: string): boolean {
    return this.commentStore.delete(id);
  }
}

export const commentService = new CommentService();
