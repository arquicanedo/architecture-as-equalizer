import { Comment, ICommentService } from "../types";
import { IEventBus, CommentAddedPayload } from "../event-bus";
import { randomBytes } from "crypto";

export class CommentService implements ICommentService {
  private comments: Map<string, Comment> = new Map();

  constructor(
    private eventBus: IEventBus,
    private getUserName: (userId: string) => string
  ) {}

  private generateId(): string {
    return randomBytes(8).toString("hex");
  }

  create(input: { taskId: string; authorId: string; body: string }): Comment {
    const comment: Comment = {
      id: this.generateId(),
      taskId: input.taskId,
      authorId: input.authorId,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    this.comments.set(comment.id, comment);

    // Publish comment.added event
    const authorName = this.getUserName(input.authorId);
    const payload: CommentAddedPayload = {
      commentId: comment.id,
      taskId: input.taskId,
      taskTitle: "", // Will be filled by router/consumer
      authorId: input.authorId,
      authorName,
    };
    this.eventBus.publish("comment.added", payload);

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
    return Array.from(this.comments.values()).filter(
      (comment) => comment.taskId === taskId
    );
  }

  delete(id: string): void {
    const comment = this.getById(id);
    this.comments.delete(id);
  }
}
