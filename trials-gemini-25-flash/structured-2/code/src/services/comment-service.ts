import { randomUUID } from 'crypto';
import { eventBus } from '../event-bus';

export interface Comment {
    id: string;
    taskId: string;
    authorId: string;
    body: string;
    createdAt: number; // Unix timestamp
}

export class CommentService {
    private comments: Map<string, Comment>;

    constructor() {
        this.comments = new Map();
    }

    // The router will be responsible for fetching taskTitle, authorName, and taskAssigneeId
    create(taskId: string, authorId: string, body: string, taskTitle: string, authorName: string, taskAssigneeId?: string): Comment {
        const id = randomUUID();
        const createdAt = Date.now();
        const newComment: Comment = { id, taskId, authorId, body, createdAt };
        this.comments.set(id, newComment);

        eventBus.publish('comment.added', {
            commentId: newComment.id,
            taskId: newComment.taskId,
            taskTitle: taskTitle,
            authorId: newComment.authorId,
            authorName: authorName,
            taskAssigneeId: taskAssigneeId // Include assigneeId for notifications
        });

        return newComment;
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
