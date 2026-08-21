// ============================================================
// Comment Service — ICommentService implementation
// ============================================================

import { randomUUID } from "crypto";
import { eventBus, CommentAddedPayload } from "../event-bus";

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO 8601
}

/**
 * Extended input accepted by this service's create method.
 * The router resolves taskTitle, authorName, and assigneeId before calling create,
 * so the event payload can be fully populated without the comment service
 * needing to import or call other services.
 */
export interface CommentCreateInput {
  taskId: string;
  authorId: string;
  body: string;
  /** Resolved by the router before calling create */
  taskTitle: string;
  /** Resolved by the router before calling create */
  authorName: string;
  /** Resolved by the router before calling create — may be null */
  assigneeId: string | null;
}

interface ICommentService {
  create(input: CommentCreateInput): Comment;
  getById(id: string): Comment;
  getByTask(taskId: string): Comment[];
  delete(id: string): void;
}

class CommentService implements ICommentService {
  private store: Map<string, Comment> = new Map();

  create(input: CommentCreateInput): Comment {
    const comment: Comment = {
      id: randomUUID(),
      taskId: input.taskId,
      authorId: input.authorId,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    this.store.set(comment.id, comment);

    const payload: CommentAddedPayload = {
      commentId: comment.id,
      taskId: input.taskId,
      taskTitle: input.taskTitle,
      authorId: input.authorId,
      authorName: input.authorName,
      assigneeId: input.assigneeId,
    };
    eventBus.publish("comment.added", payload);

    return comment;
  }

  getById(id: string): Comment {
    const comment = this.store.get(id);
    if (!comment) {
      throw new Error(`Comment not found: ${id}`);
    }
    return comment;
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.store.values()).filter(
      (comment) => comment.taskId === taskId
    );
  }

  delete(id: string): void {
    if (!this.store.has(id)) {
      throw new Error(`Comment not found: ${id}`);
    }
    this.store.delete(id);
  }
}

export const commentService = new CommentService();
