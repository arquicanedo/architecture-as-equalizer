import {
  ICommentService,
  Comment,
  IEventBus,
  CommentAddedPayload,
  IUserLookup,
  ITaskLookup,
} from "../types";
import { randomUUID } from "crypto";

export class CommentService implements ICommentService {
  // RULE 2: exclusive data ownership
  private comments: Map<string, Comment> = new Map();

  constructor(
    private eventBus: IEventBus,
    private userLookup: IUserLookup,
    private taskLookup: ITaskLookup
  ) {}

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

    // publish event
    let authorName: string;
    let taskTitle: string;
    try {
      authorName = this.userLookup.getUserName(comment.authorId);
    } catch (e) {
      authorName = "Unknown";
    }
    try {
      taskTitle = this.taskLookup.getTaskTitle(comment.taskId);
    } catch (e) {
      taskTitle = "Unknown";
    }

    const payload: CommentAddedPayload = {
      commentId: comment.id,
      taskId: comment.taskId,
      taskTitle,
      authorId: comment.authorId,
      authorName,
    };
    this.eventBus.publish("comment.added", payload);

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
    if (!this.comments.delete(id)) {
      throw new Error("Comment not found");
    }
  }
}
