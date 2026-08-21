import { Comment, ICommentService, IEventBus, CommentAddedPayload, ITaskService, IUserService } from '../types';
import * as crypto from 'node:crypto';

export class CommentService implements ICommentService {
  private comments: Map<string, Comment> = new Map();
  private eventBus: IEventBus;
  private userService: IUserService;
  private taskService: ITaskService;

  constructor(eventBus: IEventBus, userService: IUserService, taskService: ITaskService) {
    this.eventBus = eventBus;
    this.userService = userService;
    this.taskService = taskService;
  }

  create(input: { taskId: string; authorId: string; body: string }): Comment {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const newComment: Comment = { id, createdAt, ...input };
    this.comments.set(id, newComment);

    // To publish CommentAddedPayload, we need taskTitle and authorName.
    // Per architectural rules, services communicate via EventBus, but also
    // must implement interfaces exactly. To fulfill CommentAddedPayload,
    // we retrieve necessary info from other services via their interfaces
    // which are passed in the constructor, thus avoiding direct file imports.
    let taskTitle = 'Unknown Task';
    let authorName = 'Unknown Author';

    try {
      const task = this.taskService.getById(input.taskId);
      taskTitle = task.title;
    } catch (error) {
      console.warn(`Could not find task ${input.taskId} for comment event:`, error);
    }

    try {
      const author = this.userService.getById(input.authorId);
      authorName = author.name;
    } catch (error) {
      console.warn(`Could not find author ${input.authorId} for comment event:`, error);
    }

    const payload: CommentAddedPayload = {
      commentId: newComment.id,
      taskId: newComment.taskId,
      taskTitle: taskTitle,
      authorId: newComment.authorId,
      authorName: authorName,
    };
    this.eventBus.publish("comment.added", payload);

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
    if (!this.comments.delete(id)) {
      throw new Error(`Comment with ID ${id} not found`);
    }
  }
}
