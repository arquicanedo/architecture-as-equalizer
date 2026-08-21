/**
 * Comment Service
 * Manages comments on tasks
 */

import { randomUUID } from "crypto";
import { eventBus } from "../event-bus";
import { taskService } from "./task-service";
import { userService } from "./user-service";

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

  create(req: CreateCommentRequest): Comment | null {
    // Validate that task exists
    const task = taskService.getById(req.taskId);
    if (!task) return null;

    // Validate that author exists
    const author = userService.getById(req.authorId);
    if (!author) return null;

    const comment: Comment = {
      id: randomUUID(),
      taskId: req.taskId,
      authorId: req.authorId,
      body: req.body,
      createdAt: new Date().toISOString(),
    };

    this.commentStore.set(comment.id, comment);

    // Publish event
    eventBus.publish("comment.added", {
      commentId: comment.id,
      taskId: comment.taskId,
      taskTitle: task.title,
      authorId: comment.authorId,
      authorName: author.name,
    });

    return comment;
  }

  getById(id: string): Comment | null {
    return this.commentStore.get(id) || null;
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.commentStore.values()).filter(
      (comment) => comment.taskId === taskId
    );
  }

  delete(id: string): boolean {
    return this.commentStore.delete(id);
  }
}

export const commentService = new CommentService();
