// ============================================================
// Comment Service Implementation
// ============================================================

import { Comment } from "../types.js";
import { IEventBus, CommentAddedPayload } from "../event-bus.js";
import { randomUUID } from "crypto";

interface ICommentService {
  create(input: { taskId: string; authorId: string; body: string }): Comment;
  getById(id: string): Comment;
  getByTask(taskId: string): Comment[];
  delete(id: string): void;
}

class CommentService implements ICommentService {
  private comments: Map<string, Comment> = new Map();
  private eventBus: IEventBus;

  constructor(eventBus: IEventBus) {
    this.eventBus = eventBus;
  }

  create(input: { taskId: string; authorId: string; body: string }): Comment {
    const id = randomUUID();
    const comment: Comment = {
      id,
      taskId: input.taskId,
      authorId: input.authorId,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    this.comments.set(id, comment);
    return comment;
  }

  getById(id: string): Comment {
    const comment = this.comments.get(id);
    if (!comment) {
      throw new Error(`Comment with id ${id} not found`);
    }
    return comment;
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.comments.values()).filter(comment => comment.taskId === taskId);
  }

  delete(id: string): void {
    const comment = this.getById(id);
    this.comments.delete(id);
  }

  publishCommentAdded(commentId: string, taskId: string, taskTitle: string, authorId: string, authorName: string): void {
    const payload: CommentAddedPayload = {
      commentId,
      taskId,
      taskTitle,
      authorId,
      authorName,
    };
    this.eventBus.publish("comment.added", payload);
  }
}

export { ICommentService, CommentService };
