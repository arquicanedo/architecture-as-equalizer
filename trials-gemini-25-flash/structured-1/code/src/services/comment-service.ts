import { eventBus } from '../event-bus';

interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: number; // Timestamp
}

class CommentService {
  private comments: Map<string, Comment> = new Map();
  private nextId: number = 1;

  create(taskId: string, authorId: string, authorName: string, body: string, taskTitle: string): Comment {
    const id = `comment-${this.nextId++}`;
    const createdAt = Date.now();
    const newComment: Comment = { id, taskId, authorId, body, createdAt };
    this.comments.set(id, newComment);

    eventBus.publish('comment.added', { commentId: id, taskId, taskTitle, authorId, authorName });
    return newComment;
  }

  getById(id: string): Comment | undefined {
    return this.comments.get(id);
  }

  getByTask(taskId: string): Comment[] {
    return Array.from(this.comments.values()).filter(comment => comment.taskId === taskId);
  }

  delete(id: string): boolean {
    return this.comments.delete(id);
  }
}

export const commentService = new CommentService();
