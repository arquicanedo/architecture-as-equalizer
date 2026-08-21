import { randomUUID } from "crypto";
import { Comment, ICommentService, IEventBus } from "../types.js";

export class CommentService implements ICommentService {
  private store: Map<string, Comment> = new Map();
  private eventBus: IEventBus;

  // authorName resolver injected to avoid cross-service imports
  private resolveAuthorName: (authorId: string) => string;

  // taskTitle resolver injected to avoid cross-service imports
  private resolveTaskTitle: (taskId: string) => string;

  constructor(
    eventBus: IEventBus,
    resolveAuthorName: (authorId: string) => string,
    resolveTaskTitle: (taskId: string) => string
  ) {
    this.eventBus = eventBus;
    this.resolveAuthorName = resolveAuthorName;
    this.resolveTaskTitle = resolveTaskTitle;
  }

  create(input: { taskId: string; authorId: string; body: string }): Comment {
    const comment: Comment = {
      id: randomUUID(),
      taskId: input.taskId,
      authorId: input.authorId,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    this.store.set(comment.id, comment);

    const authorName = this.resolveAuthorName(input.authorId);
    const taskTitle = this.resolveTaskTitle(input.taskId);

    this.eventBus.publish("comment.added", {
      commentId: comment.id,
      taskId: comment.taskId,
      taskTitle: taskTitle,
      authorId: comment.authorId,
      authorName: authorName,
    });

    return { ...comment };
  }

  getById(id: string): Comment {
    const comment = this.store.get(id);
    if (!comment) {
      throw new Error(`Comment not found: ${id}`);
    }
    return { ...comment };
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.store.values())
      .filter((c) => c.taskId === taskId)
      .map((c) => ({ ...c }));
  }

  delete(id: string): void {
    if (!this.store.has(id)) {
      throw new Error(`Comment not found: ${id}`);
    }
    this.store.delete(id);
  }
}
