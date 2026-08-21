import crypto from "crypto";
import { eventBus } from "../event-bus";

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export type CreateCommentInput = Omit<Comment, "id" | "createdAt">;

// Extra context needed for event publishing, provided by the router.
interface CreateCommentContext {
    taskTitle: string;
    authorName: string;
}

export class CommentService {
  private readonly comments: Map<string, Comment> = new Map();

  findByTaskId(taskId: string): Comment[] {
    return Array.from(this.comments.values()).filter(
      (comment) => comment.taskId === taskId
    );
  }

  findById(id: string): Comment | undefined {
    return this.comments.get(id);
  }

  create(input: CreateCommentInput, context: CreateCommentContext): Comment {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const comment: Comment = {
      ...input,
      id,
      createdAt,
    };
    this.comments.set(id, comment);

    eventBus.publish("comment.added", {
      commentId: comment.id,
      taskId: comment.taskId,
      taskTitle: context.taskTitle,
      authorId: comment.authorId,
      authorName: context.authorName,
    });

    return comment;
  }

  delete(id: string): boolean {
    return this.comments.delete(id);
  }
}
