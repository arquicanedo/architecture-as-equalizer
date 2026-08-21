import crypto from "crypto";
import { EventBus } from "../event-bus";

export interface Comment {
    id: string;
    taskId: string;
    authorId: string;
    body: string;
    createdAt: Date;
}

export class CommentService {
    private readonly comments: Map<string, Comment> = new Map();

    constructor(private readonly eventBus: EventBus) {}

    create(taskId: string, authorId: string, body: string, taskTitle: string, authorName: string, taskAssigneeId: string | null): Comment {
        const id = crypto.randomUUID();
        const createdAt = new Date();
        const comment: Comment = { id, taskId, authorId, body, createdAt };
        this.comments.set(id, comment);

        this.eventBus.publish("comment.added", {
            commentId: id,
            taskId,
            taskTitle,
            authorId,
            authorName,
            taskAssigneeId
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