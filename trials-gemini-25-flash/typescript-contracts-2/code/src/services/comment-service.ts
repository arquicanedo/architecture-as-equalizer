import { Comment, ICommentService, IEventBus, CommentAddedPayload, Task } from '../types';
import * as crypto from 'node:crypto';

interface ITaskServiceForComments { // Mini-interface to avoid direct import of TaskService
  getById(taskId: string): Task;
}

export class CommentService implements ICommentService {
  private comments = new Map<string, Comment>();
  private eventBus: IEventBus;
  private taskService: ITaskServiceForComments; // Dependency for fetching task details

  constructor(eventBus: IEventBus, taskService: ITaskServiceForComments) {
    this.eventBus = eventBus;
    this.taskService = taskService;
  }

  create(input: { taskId: string; authorId: string; body: string }): Comment {
    // Ensure task exists before creating comment
    const task = this.taskService.getById(input.taskId); // Throws if task not found

    const newComment: Comment = {
      id: crypto.randomUUID(),
      taskId: input.taskId,
      authorId: input.authorId,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    this.comments.set(newComment.id, newComment);

    const payload: CommentAddedPayload = {
      commentId: newComment.id,
      taskId: newComment.taskId,
      authorId: newComment.authorId,
      taskAssigneeId: task.assigneeId, // Pass assigneeId for notification targeting
    };
    this.eventBus.publish('comment.added', payload);

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
