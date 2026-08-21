/**
 * Comment Service - Manages comments on tasks
 */

import { eventBus } from './event-bus';
import { taskService } from './task-service';
import { userService } from './user-service';

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  text: string;
  timestamp: number;
}

export class CommentService {
  private comments: Map<string, Comment> = new Map();
  private nextId = 1;

  /**
   * Add a comment to a task
   */
  addComment(taskId: string, authorId: string, text: string): Comment | null {
    // Verify task and user exist
    if (!taskService.taskExists(taskId)) return null;
    if (!userService.userExists(authorId)) return null;

    const id = `comment-${this.nextId++}`;
    const comment: Comment = {
      id,
      taskId,
      authorId,
      text,
      timestamp: Date.now(),
    };
    this.comments.set(id, comment);

    // Get the task to publish the event with assignee info
    const task = taskService.getTask(taskId);

    eventBus.publish('comment.added', {
      commentId: id,
      taskId,
      authorId,
      text,
      assignee: task?.assignee || null,
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
    return Array.from(this.comments.values())
      .filter((comment) => comment.taskId === taskId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Delete a comment
   */
  deleteComment(id: string): boolean {
    return this.comments.delete(id);
  }
}

export const commentService = new CommentService();
