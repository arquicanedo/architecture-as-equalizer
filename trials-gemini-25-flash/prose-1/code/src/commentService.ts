import { Comment, CommentAddedEvent } from './types';
import { EventBus } from './eventBus';

// Placeholder for UUID generation
function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class CommentService {
  private comments: Map<string, Comment> = new Map();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  public createComment(comment: Omit<Comment, 'id' | 'createdAt'> & { id?: string }): Comment {
    const newCommentId = comment.id || generateUuid();
    const newComment: Comment = {
      id: newCommentId,
      taskId: comment.taskId,
      authorId: comment.authorId,
      text: comment.text,
      createdAt: Date.now(),
    };

    if (this.comments.has(newComment.id)) {
      throw new Error(`Comment with ID ${newComment.id} already exists.`);
    }
    this.comments.set(newComment.id, newComment);

    this.eventBus.publish<CommentAddedEvent>('comment.added', {
      commentId: newComment.id,
      taskId: newComment.taskId,
      authorId: newComment.authorId,
      timestamp: newComment.createdAt,
    });

    return newComment;
  }

  public getCommentById(id: string): Comment | undefined {
    return this.comments.get(id);
  }

  public getCommentsByTaskId(taskId: string): Comment[] {
    return Array.from(this.comments.values()).filter(comment => comment.taskId === taskId);
  }

  public getAllComments(): Comment[] {
    return Array.from(this.comments.values());
  }

  public deleteComment(id: string): boolean {
    return this.comments.delete(id);
  }
}
