
import { eventBus } from './event-bus';

export interface Comment {
    id: string;
    taskId: string;
    authorId: string;
    text: string;
    createdAt: Date;
}

export class CommentService {
    private comments = new Map<string, Comment>();
    private nextId = 1;

    createComment(taskId: string, authorId: string, text: string): Comment {
        const id = `comment-${this.nextId++}`;
        const comment: Comment = { id, taskId, authorId, text, createdAt: new Date() };
        this.comments.set(id, comment);
        eventBus.publish('comment.added', comment);
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
