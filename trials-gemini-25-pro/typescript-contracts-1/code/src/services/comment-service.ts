import { randomUUID } from "crypto";
import {
  Comment,
  ICommentService,
  IEventBus,
  CommentAddedPayload,
  ITaskService,
  IUserService,
} from "../types";

export class CommentService implements ICommentService {
  private comments = new Map<string, Comment>();

  constructor(
    private eventBus: IEventBus,
    private taskService: ITaskService,
    private userService: IUserService
  ) {}

  create(input: { taskId: string; authorId: string; body: string }): Comment {
    const id = randomUUID();
    const comment: Comment = {
      id,
      ...input,
      createdAt: new Date().toISOString(),
    };
    this.comments.set(id, comment);

    // Enrich the event payload with details from other services
    const task = this.taskService.getById(input.taskId);
    const author = this.userService.getById(input.authorId);

    const payload: CommentAddedPayload = {
      commentId: id,
      taskId: input.taskId,
      taskTitle: task.title,
      authorId: input.authorId,
      authorName: author.name,
    };
    this.eventBus.publish("comment.added", payload);

    return comment;
  }

  getById(id: string): Comment {
    const comment = this.comments.get(id);
    if (!comment) {
      throw new Error(`Comment with id ${id} not found`);
    }
    return comment;
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.comments.values()).filter(
      (comment) => comment.taskId === taskId
    );
  }

  delete(id: string): void {
    if (!this.comments.has(id)) {
      throw new Error(`Comment with id ${id} not found`);
    }
    this.comments.delete(id);
  }
}
