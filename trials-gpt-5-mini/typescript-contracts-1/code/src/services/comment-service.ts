import { ICommentService, Comment, CommentAddedPayload } from "../types";
import { randomUUID } from "crypto";
import { IEventBus } from "../types";

export class CommentService implements ICommentService {
  private store: Map<string, Comment> = new Map();
  private eventBus: IEventBus;

  constructor(eventBus: IEventBus) {
    this.eventBus = eventBus;
  }

  create(input: { taskId: string; authorId: string; body: string }): Comment {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const comment: Comment = { id, taskId: input.taskId, authorId: input.authorId, body: input.body, createdAt };
    this.store.set(id, comment);
    const payload: CommentAddedPayload = { commentId: id, taskId: input.taskId, taskTitle: "", authorId: input.authorId, authorName: "" };
    // Note: taskTitle/authorName can be enriched by subscribers if needed
    this.eventBus.publish("comment.added", payload);
    return comment;
  }

  getById(id: string): Comment {
    const c = this.store.get(id);
    if (!c) throw new Error("Comment not found");
    return c;
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.store.values()).filter((c) => c.taskId === taskId);
  }

  delete(id: string): void {
    if (!this.store.has(id)) throw new Error("Comment not found");
    this.store.delete(id);
  }
}
