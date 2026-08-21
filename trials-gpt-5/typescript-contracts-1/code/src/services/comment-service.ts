import { randomUUID } from "node:crypto";
import {
  Comment,
  CommentAddedPayload,
  ICommentService,
  IEventBus,
} from "../types";

export class CommentService implements ICommentService {
  private comments: Map<string, Comment> = new Map();

  constructor(private bus: IEventBus) {}

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
    // Publish event with minimal data; enrichment is done by subscribers using their own lookups
    const payload: CommentAddedPayload = {
      commentId: id,
      taskId: input.taskId,
      taskTitle: "", // will be enriched by subscribers if needed
      authorId: input.authorId,
      authorName: "", // will be enriched by subscribers if needed
    };
    this.bus.publish("comment.added", payload);
    return comment;
  }

  getById(id: string): Comment {
    const c = this.comments.get(id);
    if (!c) throw new Error("Comment not found");
    return c;
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.comments.values()).filter((c) => c.taskId === taskId);
  }

  delete(id: string): void {
    if (!this.comments.has(id)) throw new Error("Comment not found");
    this.comments.delete(id);
  }
}
