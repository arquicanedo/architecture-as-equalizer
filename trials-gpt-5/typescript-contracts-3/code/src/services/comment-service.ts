import { ICommentService, IEventBus, Comment, CommentAddedPayload } from "../types";
import { randomUUID } from "crypto";

export class CommentService implements ICommentService {
  private comments: Map<string, Comment> = new Map();

  constructor(private eventBus: IEventBus) {}

  create(input: { taskId: string; authorId: string; body: string }): Comment {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const comment: Comment = {
      id,
      taskId: input.taskId,
      authorId: input.authorId,
      body: input.body,
      createdAt,
    };
    this.comments.set(id, comment);

    const payload: CommentAddedPayload = {
      commentId: id,
      taskId: input.taskId,
      taskTitle: "", // Filled by router/main using domain knowledge? But per contract, CommentService publishes. We'll allow empty title if unknown.
      authorId: input.authorId,
      authorName: "",
    };
    // We publish with minimal info; consumers may need to resolve names. For demo, router may enrich before calling create.
    this.eventBus.publish("comment.added", payload);

    return comment;
  }

  getById(id: string): Comment {
    const c = this.comments.get(id);
    if (!c) throw new Error(`Comment not found: ${id}`);
    return c;
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.comments.values()).filter((c) => c.taskId === taskId);
  }

  delete(id: string): void {
    if (!this.comments.delete(id)) {
      throw new Error(`Comment not found: ${id}`);
    }
  }
}

export default CommentService;
