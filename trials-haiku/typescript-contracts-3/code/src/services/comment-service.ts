// ============================================================
// Comment Service
// ============================================================

import { IEventBus } from "../event-bus.js";

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO 8601
}

export interface CommentAddedPayload {
  commentId: string;
  taskId: string;
  taskTitle: string;
  authorId: string;
  authorName: string;
}

export interface ICommentService {
  create(input: { taskId: string; authorId: string; body: string }): Comment;
  getById(id: string): Comment;
  getByTask(taskId: string): Comment[];
  delete(id: string): void;
}

export class CommentService implements ICommentService {
  private comments: Map<string, Comment> = new Map();
  private nextId = 1;

  constructor(private eventBus: IEventBus) {}

  create(input: { taskId: string; authorId: string; body: string }): Comment {
    const id = `comment-${this.nextId++}`;
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
      throw new Error(`Comment not found: ${id}`);
    }
    return comment;
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.comments.values()).filter((c) => c.taskId === taskId);
  }

  delete(id: string): void {
    if (!this.comments.has(id)) {
      throw new Error(`Comment not found: ${id}`);
    }
    this.comments.delete(id);
  }

  publishCommentAdded(
    commentId: string,
    taskId: string,
    taskTitle: string,
    authorId: string,
    authorName: string
  ): void {
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
