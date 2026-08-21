import { Comment, CommentId, TaskId, UserId } from './types';
import { EventBus } from './event-bus.js'; // Corrected import with .js extension
import { generateId } from './utils';

export class CommentService {
  private comments: Map<CommentId, Comment> = new Map();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    // Seed some initial data
    this.createComment({
      taskId: 'task1', // Assuming 'task1' is a valid TaskId for demo purposes
      authorId: 'user1', // Assuming 'user1' is a valid UserId
      text: 'Initial thoughts on the design approach.',
    });
  }

  public createComment(commentData: {
    taskId: TaskId;
    authorId: UserId;
    text: string;
  }): Comment {
    const newComment: Comment = {
      id: generateId(),
      createdAt: Date.now(),
      ...commentData,
    };
    this.comments.set(newComment.id, newComment);
    // The Event definition has a payload field.
    this.eventBus.publish({ name: 'comment.added', payload: { commentId: newComment.id, taskId: newComment.taskId, authorId: newComment.authorId } });
    return newComment;
  }

  public getComment(id: CommentId): Comment | undefined {
    return this.comments.get(id);
  }

  public getCommentsByTask(taskId: TaskId): Comment[] {
    return Array.from(this.comments.values()).filter(comment => comment.taskId === taskId);
  }

  public getAllComments(): Comment[] {
    return Array.from(this.comments.values());
  }

  public deleteComment(id: CommentId): boolean {
    return this.comments.delete(id);
  }
}
