import { Comment, CommentAddedEvent } from '../types';
import { EventBus } from '../event-bus';
import { randomUUID } from 'crypto';

export class CommentService {
  private comments: Map<string, Comment> = new Map();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  public addComment(taskId: string, authorId: string, text: string): Comment {
    const newComment: Comment = {
      id: randomUUID(),
      taskId,
      authorId,
      text,
      createdAt: Date.now(),
    };
    this.comments.set(newComment.id, newComment);

    // Publish event
    this.eventBus.publish<CommentAddedEvent>('comment.added', {
      commentId: newComment.id,
      taskId: newComment.taskId,
      authorId: newComment.authorId,
      text: newComment.text,
    });

    return newComment;
  }

  public getCommentById(id: string): Comment | undefined {
    return this.comments.get(id);
  }

  public getCommentsByTaskId(taskId: string): Comment[] {
    return Array.from(this.comments.values()).filter(comment => comment.taskId === taskId);
  }

  public deleteComment(id: string): boolean {
    return this.comments.delete(id);
  }
}
