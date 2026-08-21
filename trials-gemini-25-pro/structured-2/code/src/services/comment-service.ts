import crypto from 'crypto';
import { EventBus } from '../event-bus';

export interface Comment {
    id: string;
    taskId: string;
    authorId: string;
    body: string;
    createdAt: Date;
}

// Extra data needed for publishing the event, passed in by the router.
interface CommentEventData {
    taskTitle: string;
    authorName: string;
    taskAssigneeId: string | null;
}

export class CommentService {
    private comments: Map<string, Comment> = new Map();

    constructor(private eventBus: EventBus) {}

    // Create
    create(data: { taskId: string; authorId: string; body: string; }, eventData: CommentEventData): Comment {
        const id = crypto.randomUUID();
        const comment: Comment = {
            id,
            ...data,
            createdAt: new Date(),
        };
        this.comments.set(id, comment);

        // Publish event only if there is an assignee to notify
        if (eventData.taskAssigneeId) {
            this.eventBus.publish('comment.added', {
                commentId: comment.id,
                taskId: comment.taskId,
                authorId: comment.authorId,
                taskTitle: eventData.taskTitle,
                authorName: eventData.authorName,
                // Pass this along so the notification service knows who to notify
                taskAssigneeId: eventData.taskAssigneeId,
            });
        }

        return comment;
    }

    // Get by ID
    getById(id: string): Comment | undefined {
        return this.comments.get(id);
    }

    // Get by Task
    getByTask(taskId: string): Comment[] {
        return Array.from(this.comments.values()).filter(comment => comment.taskId === taskId);
    }

    // Delete
    delete(id: string): boolean {
        return this.comments.delete(id);
    }
}
