import * as crypto from 'crypto';
import {
    Comment,
    ICommentService,
    IEventBus,
    CommentAddedPayload,
    IUserService,
    ITaskService
} from '../contracts';

export class CommentService implements ICommentService {
    private readonly comments = new Map<string, Comment>();

    constructor(
        private readonly eventBus: IEventBus,
        private readonly userService: IUserService,
        private readonly taskService: ITaskService
    ) {}

    create(input: { taskId: string; authorId: string; body: string }): Comment {
        const id = crypto.randomUUID();
        const comment: Comment = {
            id,
            ...input,
            createdAt: new Date().toISOString(),
        };
        this.comments.set(id, comment);

        const author = this.userService.getById(input.authorId);
        const task = this.taskService.getById(input.taskId);

        if (!author) {
            throw new Error(`Author with id ${input.authorId} not found`);
        }
        if (!task) {
            throw new Error(`Task with id ${input.taskId} not found`);
        }

        this.eventBus.publish('comment.added', {
            commentId: comment.id,
            taskId: task.id,
            taskTitle: task.title,
            authorId: author.id,
            authorName: author.name,
        } as CommentAddedPayload);

        return comment;
    }

    getById(id: string): Comment | undefined {
        return this.comments.get(id);
    }

    getByTask(taskId: string): Comment[] {
        return Array.from(this.comments.values()).filter(
            (comment) => comment.taskId === taskId
        );
    }

    delete(id: string): void {
        if (!this.comments.has(id)) {
            throw new Error(`Comment with id ${id} not found`);
        }
        this.comments.delete(id);
    }
}
