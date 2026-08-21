import { Comment, ICommentService, IEventBus, CommentCreatedRawPayload } from '../types'; // Corrected import path
import * as crypto from 'node:crypto';

export class CommentService implements ICommentService {
  private comments: Map<string, Comment>;
  private eventBus: IEventBus;

  constructor(eventBus: IEventBus) {
    this.comments = new Map();
    this.eventBus = eventBus;
  }

  create(input: { taskId: string; authorId: string; body: string }): Comment {
    const id = crypto.randomUUID();
    const newComment: Comment = { id, createdAt: new Date().toISOString(), ...input };
    this.comments.set(id, newComment);

    const payload: CommentCreatedRawPayload = {
      commentId: newComment.id,
      taskId: newComment.taskId,
      authorId: newComment.authorId,
    };
    // Publish a raw event that will be enriched by main.ts
    this.eventBus.publish("comment.created.raw", payload);

    return newComment;
  }

  getById(id: string): Comment {
    const comment = this.comments.get(id);
    if (!comment) {
      throw new Error(`Comment with ID ${id} not found`);
    }
    return comment;
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.comments.values()).filter(comment => comment.taskId === taskId);
  }

  delete(id: string): void {
    if (!this.comments.has(id)) {
      throw new Error(`Comment with ID ${id} not found`);
    }
    this.comments.delete(id);
  }
}
