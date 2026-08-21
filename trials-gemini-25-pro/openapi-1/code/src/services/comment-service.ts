import * as crypto from 'crypto';
import { eventBus } from '../event-bus';

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export type CreateCommentInput = Omit<Comment, 'id' | 'createdAt'>;

export class CommentService {

  // Dependencies injected for decoupling
  constructor(
    private getTask: (id: string) => { title: string } | undefined,
    private getUser: (id: string) => { name: string } | undefined,
  ) {}

  private readonly comments: Map<string, Comment> = new Map();

  public createComment(input: CreateCommentInput): Comment | 'TASK_NOT_FOUND' | 'AUTHOR_NOT_FOUND' {
    const task = this.getTask(input.taskId);
    if (!task) {
      return 'TASK_NOT_FOUND';
    }

    const author = this.getUser(input.authorId);
    if(!author) {
        return 'AUTHOR_NOT_FOUND';
    }

    const id = crypto.randomUUID();
    const comment: Comment = {
      id,
      ...input,
      createdAt: new Date().toISOString(),
    };
    this.comments.set(id, comment);

    eventBus.publish('comment.added', {
        commentId: comment.id,
        taskId: comment.taskId,
        taskTitle: task.title,
        authorId: comment.authorId,
        authorName: author.name,
    });

    return comment;
  }

  public getComment(id: string): Comment | undefined {
    return this.comments.get(id);
  }

  public listCommentsByTask(taskId: string): Comment[] {
    return Array.from(this.comments.values()).filter(
      (comment) => comment.taskId === taskId
    );
  }

  public deleteComment(id: string): boolean {
    return this.comments.delete(id);
  }
}
