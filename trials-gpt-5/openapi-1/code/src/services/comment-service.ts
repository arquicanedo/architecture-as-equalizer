import { randomUUID } from 'crypto';
import { Comment, CreateCommentInput, UUID } from '../types';
import { EventBus } from '../event-bus';

export class CommentService {
  private comments: Map<UUID, Comment> = new Map();
  // For quick lookup of task title and author name when publishing events, we will accept providers via constructor
  constructor(private eventBus: EventBus, private getTaskTitle: (taskId: UUID) => string | undefined, private getUserName: (userId: UUID) => string | undefined) {}

  listByTask(taskId: UUID): Comment[] {
    return Array.from(this.comments.values()).filter(c => c.taskId === taskId);
  }

  create(input: CreateCommentInput): Comment {
    const comment: Comment = {
      id: randomUUID(),
      taskId: input.taskId,
      authorId: input.authorId,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    this.comments.set(comment.id, comment);
    const taskTitle = this.getTaskTitle(input.taskId) || 'Unknown Task';
    const authorName = this.getUserName(input.authorId) || 'Someone';
    this.eventBus.publish('comment.added', {
      commentId: comment.id,
      taskId: comment.taskId,
      taskTitle,
      authorId: comment.authorId,
      authorName,
    });
    return comment;
  }

  get(id: UUID): Comment | undefined {
    return this.comments.get(id);
  }

  delete(id: UUID): boolean {
    return this.comments.delete(id);
  }
}
