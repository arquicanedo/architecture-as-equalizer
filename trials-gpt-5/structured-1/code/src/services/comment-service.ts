import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: number; // epoch ms
}

export class CommentService {
  private comments: Map<string, Comment> = new Map();

  constructor(private bus: EventBus, private getTaskTitle: (taskId: string) => string | undefined, private getUserName: (userId: string) => string | undefined) {}

  create(data: { taskId: string; authorId: string; body: string }): Comment {
    const comment: Comment = {
      id: randomUUID(),
      taskId: data.taskId,
      authorId: data.authorId,
      body: data.body,
      createdAt: Date.now(),
    };
    this.comments.set(comment.id, comment);

    const taskTitle = this.getTaskTitle(comment.taskId);
    const authorName = this.getUserName(comment.authorId);

    this.bus.publish('comment.added', {
      commentId: comment.id,
      taskId: comment.taskId,
      taskTitle,
      authorId: comment.authorId,
      authorName,
    });

    return comment;
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.comments.values()).filter((c) => c.taskId === taskId);
  }

  getById(id: string): Comment | undefined {
    return this.comments.get(id);
  }

  delete(id: string): boolean {
    return this.comments.delete(id);
  }
}
