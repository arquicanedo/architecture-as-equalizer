
import { Comment, CreateCommentInput, CommentId, TaskId, UserId } from '../types';
import { EventBus } from '../event-bus';
import * as crypto from 'crypto';

export class CommentService {
    private comments: Map<CommentId, Comment>;
    private eventBus: EventBus;

    constructor(eventBus: EventBus) {
        this.comments = new Map();
        this.eventBus = eventBus;
    }

    public async getCommentsByTaskId(taskId: TaskId): Promise<Comment[]> {
        return Array.from(this.comments.values()).filter(comment => comment.taskId === taskId);
    }

    public async getCommentById(id: CommentId): Promise<Comment | undefined> {
        return this.comments.get(id);
    }

    public async createComment(input: CreateCommentInput, taskTitle: string, authorName: string): Promise<Comment> {
        const newComment: Comment = {
            id: crypto.randomUUID(),
            taskId: input.taskId,
            authorId: input.authorId,
            body: input.body,
            createdAt: new Date().toISOString(),
        };
        this.comments.set(newComment.id, newComment);
        this.eventBus.publish('comment.added', {
            commentId: newComment.id,
            taskId: newComment.taskId,
            taskTitle: taskTitle,
            authorId: newComment.authorId,
            authorName: authorName,
        });
        return newComment;
    }

    public async deleteComment(id: CommentId): Promise<boolean> {
        return this.comments.delete(id);
    }
}
