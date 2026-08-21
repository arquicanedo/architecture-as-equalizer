import { randomUUID } from "crypto";
import { EventBus } from "./event-bus";
import { Comment } from "./types";

/**
 * CommentService — owns all comment data.
 *
 * Publishes:
 *   • comment.added — when a comment is created
 *
 * The service expects the caller (router) to supply the task's current
 * title and assigneeId so that the event payload is fully self-contained
 * without requiring a direct call to the TaskService.
 */
export class CommentService {
  private comments: Map<string, Comment> = new Map();

  constructor(private readonly eventBus: EventBus) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  /**
   * Creates a comment.
   *
   * @param taskTitle   – title of the parent task (for the event payload)
   * @param assigneeId  – current assignee of the parent task (may be null)
   */
  createComment(data: {
    taskId: string;
    authorId: string;
    body: string;
    taskTitle: string;
    assigneeId: string | null;
  }): Comment {
    if (!data.taskId) throw new Error("taskId is required");
    if (!data.authorId) throw new Error("authorId is required");
    if (!data.body) throw new Error("body is required");

    const comment: Comment = {
      id: randomUUID(),
      taskId: data.taskId,
      authorId: data.authorId,
      body: data.body,
      createdAt: new Date().toISOString(),
    };

    this.comments.set(comment.id, comment);

    this.eventBus.publish("comment.added", {
      commentId: comment.id,
      taskId: comment.taskId,
      taskTitle: data.taskTitle,
      authorId: comment.authorId,
      assigneeId: data.assigneeId,
      body: comment.body,
    });

    return comment;
  }

  getComment(id: string): Comment {
    const comment = this.comments.get(id);
    if (!comment) throw new Error(`Comment "${id}" not found`);
    return comment;
  }

  getCommentsByTask(taskId: string): Comment[] {
    return Array.from(this.comments.values())
      .filter((c) => c.taskId === taskId)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  }

  deleteComment(id: string): void {
    if (!this.comments.has(id)) throw new Error(`Comment "${id}" not found`);
    this.comments.delete(id);
  }

  /** Delete all comments belonging to a task (e.g. when a task is deleted). */
  deleteCommentsByTask(taskId: string): void {
    for (const [id, comment] of this.comments) {
      if (comment.taskId === taskId) {
        this.comments.delete(id);
      }
    }
  }
}
