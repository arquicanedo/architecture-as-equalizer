/**
 * Comment Service
 * Manages comment data. Publishes events to the event bus when comments are added.
 * No other service may access this store.
 */

import { eventBus } from '../event-bus';

interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

class CommentService {
  private store: Map<string, Comment> = new Map();
  private nextId = 1;

  /**
   * Create a new comment
   */
  create(
    taskId: string,
    authorId: string,
    body: string,
    taskTitle?: string,
    authorName?: string
  ): Comment {
    const id = `comment-${this.nextId++}`;
    const createdAt = new Date().toISOString();
    const comment: Comment = {
      id,
      taskId,
      authorId,
      body,
      createdAt,
    };
    this.store.set(id, comment);

    // Publish event for comment added
    eventBus.publish('comment.added', {
      commentId: id,
      taskId,
      taskTitle: taskTitle || '',
      authorId,
      authorName: authorName || '',
    });

    return comment;
  }

  /**
   * Get comment by ID
   */
  getById(id: string): Comment | undefined {
    return this.store.get(id);
  }

  /**
   * Get all comments for a task
   */
  listByTask(taskId: string): Comment[] {
    return Array.from(this.store.values()).filter(
      comment => comment.taskId === taskId
    );
  }

  /**
   * Get all comments
   */
  listAll(): Comment[] {
    return Array.from(this.store.values());
  }

  /**
   * Delete comment
   */
  delete(id: string): boolean {
    return this.store.delete(id);
  }
}

export const commentService = new CommentService();
