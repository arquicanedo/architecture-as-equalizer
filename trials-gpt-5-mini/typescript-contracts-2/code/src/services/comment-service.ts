import { ICommentService, Comment, CommentAddedPayload } from "../types";
import { EventBus } from "../event-bus";

const genId = (): string => {
  if (typeof (globalThis as any).crypto?.randomUUID === "function") return (globalThis as any).crypto.randomUUID();
  return "c-" + Math.random().toString(36).slice(2, 10);
};

export class CommentService implements ICommentService {
  private store: Map<string, Comment> = new Map();
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  create(input: { taskId: string; authorId: string; body: string }): Comment {
    const id = genId();
    const createdAt = new Date().toISOString();
    const comment: Comment = { id, taskId: input.taskId, authorId: input.authorId, body: input.body, createdAt };
    this.store.set(id, comment);
    // Need author name and task title; cannot access other services here. We'll emit authorId and taskId; main will enrich.
    const payload: CommentAddedPayload = { commentId: id, taskId: input.taskId, taskTitle: "", authorId: input.authorId, authorName: "" };
    this.bus.publish("comment.added", payload);
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
    if (!this.store.delete(id)) throw new Error("Comment not found");
  }
}
