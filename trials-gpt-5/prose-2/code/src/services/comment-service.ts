import { EventBus, CommentAddedEvent } from '../event-bus';

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  text: string;
  createdAt: number; // timestamp ms
}

export class CommentService {
  private comments: Map<string, Comment> = new Map();
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  list(filter?: { taskId?: string }): Comment[] {
    let arr = Array.from(this.comments.values());
    if (filter?.taskId) arr = arr.filter((c) => c.taskId === filter.taskId);
    return arr;
  }

  get(id: string): Comment | undefined {
    return this.comments.get(id);
  }

  create(input: { taskId: string; authorId: string; text: string }): Comment {
    const id = this.generateId();
    const comment: Comment = { id, taskId: input.taskId, authorId: input.authorId, text: input.text, createdAt: Date.now() };
    this.comments.set(id, comment);
    const event: CommentAddedEvent = { commentId: id, taskId: comment.taskId, authorId: comment.authorId, text: comment.text };
    this.bus.publish('comment.added', event);
    return comment;
  }

  delete(id: string): boolean {
    return this.comments.delete(id);
  }

  private generateId(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}
