/**
 * Comment Service
 * Manages comment data and operations.
 * Publishes events when comments are added.
 */

import { randomUUID } from 'crypto';
import { eventBus } from '../event-bus';
import { userService } from './user-service';
import { taskService } from './task-service';

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

class CommentService {
  private store: Map<string, Comment> = new Map();

  /**
   * Get all comments for a task.
   */
  getCommentsByTask(taskId: string): Comment[] {
    return Array.from(this.store.values()).filter(c => c.taskId === taskId);
  }

  /**
   * Get a comment by ID.
   */
  getCommentById(id: string): Comment | undefined {
    return this.store.get(id);
  }

  /**
   * Create a new comment.
   * Publishes a comment.added event.
   */
  createComment(input: CreateCommentInput): Comment {
    const comment: Comment = {
      id: randomUUID(),
      taskId: input.taskId,
      authorId: input.authorId,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    this.store.set(comment.id, comment);

    // Publish event for comment added
    // Get task and author info for the event
    const task = taskService.getTaskById(input.taskId);
    const author = userService.getUserById(input.authorId);

    eventBus.publish('comment.added', {
      commentId: comment.id,
      taskId: input.taskId,
      taskTitle: task?.title || 'Unknown Task',
      authorId: input.authorId,
      authorName: author?.name || 'Unknown Author',
    });

    return comment;
  }

  /**
   * Delete a comment.
   * Returns true if deleted, false if not found.
   */
  deleteComment(id: string): boolean {
    return this.store.delete(id);
  }
}

export const commentService = new CommentService();
