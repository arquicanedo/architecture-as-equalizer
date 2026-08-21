import { randomBytes } from 'crypto';
import { EventBus } from './event-bus';

export interface Comment {
    id: string;
    taskId: string;
    authorId: string;
    text: string;
    createdAt: Date;
}

export class CommentService {
    private comments: Map<string, Comment> = new Map();

    constructor(private eventBus: EventBus) {}

    addComment(taskId: string, authorId: string, text: string): Comment {
        const id = randomBytes(16).toString('hex');
        const comment: Comment = { id, taskId, authorId, text, createdAt: new Date() };
        this.comments.set(id, comment);
        this.eventBus.publish('comment.added', comment);
        return comment;
    }

    getComment(id: string): Comment | undefined {
        return this.comments.get(id);
    }

    getCommentsByTask(taskId: string): Comment[] {
        return Array.from(this.comments.values()).filter(comment => comment.taskId === taskId);
    }

    deleteComment(id: string): boolean {
        const comment = this.comments.get(id);
        if(comment){
            this.eventBus.publish('comment.deleted', comment);
            return this.comments.delete(id);
        }
        return false;
    }
}
