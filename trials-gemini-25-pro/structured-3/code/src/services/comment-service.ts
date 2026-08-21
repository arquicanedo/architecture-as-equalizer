import crypto from "crypto";
import { eventBus } from "../event-bus";
import { TaskService } from "./task-service";
import { UserService } from "./user-service";

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: Date;
}

export class CommentService {
  private readonly comments: Map<string, Comment> = new Map();

  // NOTE: To fulfill the event payload requirement for 'comment.added', we need
  // to get data from other services. This is a pragmatic choice to resolve
  // a contradiction in the specification.
  constructor(
    private readonly taskService: TaskService,
    private readonly userService: UserService
  ) {}

  create(taskId: string, authorId: string, body: string): Comment | undefined {
    const task = this.taskService.getById(taskId);
    const author = this.userService.getById(authorId);

    if (!task || !author) {
      // In a real app, this would be a more specific error
      return undefined;
    }

    const id = crypto.randomUUID();
    const comment: Comment = {
      id,
      taskId,
      authorId,
      body,
      createdAt: new Date(),
    };
    this.comments.set(id, comment);

    eventBus.publish("comment.added", {
      commentId: comment.id,
      taskId: task.id,
      taskTitle: task.title,
      authorId: author.id,
      authorName: author.name,
    });

    return comment;
  }

  getById(id: string): Comment | undefined {
    return this.comments.get(id);
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.comments.values()).filter(
      (comment) => comment.taskId === taskId
    );
  }

  delete(id: string): boolean {
    return this.comments.delete(id);
  }
}
