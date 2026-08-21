/**
 * Comment Service: Manages comments on tasks
 * Data: { id, taskId, authorId, body, createdAt }
 * Events published: comment.added
 */

import { eventBus } from '../event-bus';
import { taskService } from './task-service';
import { userService } from './user-service';

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: Date;
}

export class CommentService {
  private store: Map<string, Comment> = new Map();
  private idCounter = 0;

  /**
   * Create a new comment
   */
  create(taskId: string, authorId: string, body: string): Comment {
    const id = `c${++this.idCounter}`;
    const comment: Comment = {
      id,
      taskId,
      authorId,
      body,
      createdAt: new Date(),
    };
    this.store.set(id, comment);

    // Publish event for notification service
    const task = taskService.getById(taskId);
    const author = userService.getById(authorId);
    
    if (task && author) {
      eventBus.publish('comment.added', {
        commentId: comment.id,
        taskId: comment.taskId,
        taskTitle: task.title,
        authorId: comment.authorId,
        authorName: author.name,
      });
    }

    return comment;
  }

  /**
   * Get a comment by ID
   */
  getById(id: string): Comment | undefined {
    return this.store.get(id);
  }

  /**
   * Get comments by task
   */
  getByTask(taskId: string): Comment[] {
    return Array.from(this.store.values()).filter(
      comment => comment.taskId === taskId
    );
  }

  /**
   * Delete a comment
   */
  delete(id: string): boolean {
    return this.store.delete(id);
  }
}

export const commentService = new CommentService();
