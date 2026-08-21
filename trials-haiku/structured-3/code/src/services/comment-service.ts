// Comment Service - Manages comments on tasks
import { randomUUID } from "crypto";
import { eventBus } from "../event-bus";
import { taskService } from "./task-service";
import { userService } from "./user-service";

interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: Date;
}

class CommentService {
  private store: Map<string, Comment> = new Map();

  /**
   * Create a new comment
   */
  create(taskId: string, authorId: string, body: string): Comment {
    const task = taskService.getById(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const author = userService.getById(authorId);
    if (!author) {
      throw new Error(`User ${authorId} not found`);
    }

    const comment: Comment = {
      id: randomUUID(),
      taskId,
      authorId,
      body,
      createdAt: new Date(),
    };
    this.store.set(comment.id, comment);

    // Publish event
    eventBus.publish("comment.added", {
      commentId: comment.id,
      taskId,
      taskTitle: task.title,
      authorId,
      authorName: author.name,
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
   * Get comments by task
   */
  getByTask(taskId: string): Comment[] {
    return Array.from(this.store.values())
      .filter((comment) => comment.taskId === taskId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Delete a comment
   */
  delete(id: string): boolean {
    return this.store.delete(id);
  }
}

export const commentService = new CommentService();
