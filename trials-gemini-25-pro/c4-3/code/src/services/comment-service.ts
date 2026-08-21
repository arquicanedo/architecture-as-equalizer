import crypto from 'crypto';
import { eventBus } from '../event-bus';

export interface Comment {
    id: string;
    taskId: string;
    authorId: string;
    body: string;
    createdAt: string;
}

class CommentService {
    private readonly comments = new Map<string, Comment>();

    create(taskId: string, authorId: string, body: string, taskTitle: string, authorName: string): Comment {
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const comment: Comment = { id, taskId, authorId, body, createdAt };
        this.comments.set(id, comment);

        eventBus.publish('comment.added', { 
            commentId: id, 
            taskId, 
            taskTitle,
            authorId, 
            authorName 
        });

        return comment;
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
