import { randomUUID } from 'crypto';
import { eventBus } from '../event-bus';

export interface Comment {
    id: string;
    taskId: string;
    authorId: string;
    body: string;
    createdAt: string;
}

// CreateCommentInput now includes taskTitle and authorName for event publishing
export interface CreateCommentInput {
    taskId: string;
    authorId: string;
    authorName: string; // Provided by router for event enrichment
    taskTitle: string; // Provided by router for event enrichment
    body: string;
}

export class CommentService {
    private comments: Map<string, Comment>;

    constructor() {
        this.comments = new Map();
    }

    listComments(taskId: string): Comment[] {
        return Array.from(this.comments.values()).filter(comment => comment.taskId === taskId);
    }

    getComment(id: string): Comment | undefined {
        return this.comments.get(id);
    }

    createComment(input: CreateCommentInput): Comment {
        const newComment: Comment = {
            id: randomUUID(),
            taskId: input.taskId,
            authorId: input.authorId,
            body: input.body,
            createdAt: new Date().toISOString(),
        };
        this.comments.set(newComment.id, newComment);

        eventBus.publish('comment.added', {
            commentId: newComment.id,
            taskId: newComment.taskId,
            taskTitle: input.taskTitle, // Use the provided taskTitle
            authorId: newComment.authorId,
            authorName: input.authorName, // Use the provided authorName
        });

        return newComment;
    }

    deleteComment(id: string): boolean {
        return this.comments.delete(id);
    }
}
