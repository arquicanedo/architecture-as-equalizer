import { randomUUID } from 'crypto';
import { 
    Comment, 
    ICommentService, 
    IEventBus, 
    CommentAddedPayload, 
    ITaskService, 
    IUserService 
} from '../types';

export class CommentService implements ICommentService {
    private comments: Map<string, Comment> = new Map();

    constructor(
        private eventBus: IEventBus,
        private taskService: ITaskService, // For enriching payload
        private userService: IUserService // For enriching payload
    ) {}

    create(input: { taskId: string; authorId: string; body: string }): Comment {
        // In a real system, we'd validate taskId and authorId exist.
        // Here we trust the router to have done so.
        const newComment: Comment = {
            id: randomUUID(),
            taskId: input.taskId,
            authorId: input.authorId,
            body: input.body,
            createdAt: new Date().toISOString(),
        };
        this.comments.set(newComment.id, newComment);

        // Enrich payload for notification service
        try {
            const task = this.taskService.getById(input.taskId);
            const author = this.userService.getById(input.authorId);

            const payload: CommentAddedPayload = {
                commentId: newComment.id,
                taskId: task.id,
                taskTitle: task.title,
                authorId: author.id,
                authorName: author.name,
            };
            this.eventBus.publish('comment.added', payload);
        } catch (error) {
            // Log error, but don't fail the comment creation
            console.error("Failed to publish comment.added event:", error);
        }

        return newComment;
    }

    getById(id: string): Comment {
        const comment = this.comments.get(id);
        if (!comment) {
            throw new Error('Comment not found');
        }
        return comment;
    }

    getByTask(taskId: string): Comment[] {
        return Array.from(this.comments.values()).filter(c => c.taskId === taskId);
    }

    delete(id: string): void {
        if (!this.comments.delete(id)) {
            throw new Error('Comment not found');
        }
    }
}
