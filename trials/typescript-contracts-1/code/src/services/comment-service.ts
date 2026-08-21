import { randomUUID } from "crypto";
import { Comment, ICommentService, IEventBus, CommentAddedPayload } from "../types";

export class CommentService implements ICommentService {
  private store: Map<string, Comment> = new Map();
  private eventBus: IEventBus;

  // taskTitle resolver is injected to avoid cross-service imports (RULE 1)
  private resolveTaskTitle: (taskId: string) => string;
  // authorName resolver is injected to avoid cross-service imports (RULE 1)
  private resolveAuthorName: (authorId: string) => string;

  constructor(
    eventBus: IEventBus,
    resolveTaskTitle: (taskId: string) => string,
    resolveAuthorName: (authorId: string) => string
  ) {
    this.eventBus = eventBus;
    this.resolveTaskTitle = resolveTaskTitle;
    this.resolveAuthorName = resolveAuthorName;
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

    const taskTitle = this.resolveTaskTitle(input.taskId);
    const authorName = this.resolveAuthorName(input.authorId);

    const payload: CommentAddedPayload = {
      commentId: comment.id,
      taskId: input.taskId,
      taskTitle,
      authorId: input.authorId,
      authorName,
    };
    this.eventBus.publish("comment.added", payload);

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
