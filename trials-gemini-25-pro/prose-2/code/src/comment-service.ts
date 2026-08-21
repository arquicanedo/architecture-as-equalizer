import { Comment } from './types';
import { randomUUID } from 'crypto';
import { eventBus } from './event-bus';

export class CommentService {
    private comments: Map<string, Comment> = new Map();

    addComment(taskId: string, authorId: string, text: string): Comment {
        const id = randomUUID();
        const createdAt = new Date();
        const comment: Comment = { id, taskId, authorId, text, createdAt };
        this.comments.set(id, comment);

        eventBus.publish('comment.added', { taskId, authorId, text });

        return comment;
    }

    getComment(id: string): Comment | undefined {
        return this.comments.get(id);
    }

    getCommentsByTask(taskId: string): Comment[] {
        return Array.from(this.comments.values()).filter(comment => comment.taskId === taskId);
    }

    deleteComment(id: string): boolean {
        return this.comments.delete(id);
    }
}
