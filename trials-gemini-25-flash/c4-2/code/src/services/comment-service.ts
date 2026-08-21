import { Comment, UUID, CommentAddedEvent } from '../types';
import { EventBus } from '../event-bus';
import * as crypto from 'crypto';

function generateUUID(): UUID {
    return crypto.randomUUID();
}

export class CommentService {
    private comments: Map<UUID, Comment> = new Map();
    private eventBus: EventBus;

    constructor(eventBus: EventBus) {
        this.eventBus = eventBus;
    }

    public create(taskId: UUID, authorId: UUID, authorName: string, body: string): Comment {
        if (!taskId || !authorId || !body) {
            throw new Error('Task ID, author ID, and comment body are required.');
        }
        const newComment: Comment = {
            id: generateUUID(),
            taskId,
            authorId,
            body,
            createdAt: new Date().toISOString(),
        };
        this.comments.set(newComment.id, newComment);

        this.eventBus.publish('comment.added', {
            commentId: newComment.id,
            taskId: newComment.taskId,
            taskTitle: '', // Placeholder, router/calling service needs to fill this if needed
            authorId: newComment.authorId,
            authorName: authorName,
        } as CommentAddedEvent);

        return newComment;
    }

    public getById(id: UUID): Comment | undefined {
        return this.comments.get(id);
    }

    public getByTask(taskId: UUID): Comment[] {
        return Array.from(this.comments.values()).filter(comment => comment.taskId === taskId);
    }

    public delete(id: UUID): boolean {
        return this.comments.delete(id);
    }
}
