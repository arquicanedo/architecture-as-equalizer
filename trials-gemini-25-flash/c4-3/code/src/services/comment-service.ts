import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

/**
 * @deprecated Use `src/types/comment.ts` once type definitions are centralized
 */
export interface Comment {
    id: string;
    taskId: string;
    authorId: string;
    body: string;
    createdAt: string;
}

/**
 * Manages comments on tasks and publishes comment events.
 * Adheres to ADR-002: Service-Owned Data Stores.
 */
export class CommentService {
    private commentStore: Map<string, Comment>;
    private eventBus: EventBus;

    constructor(eventBus: EventBus) {
        this.commentStore = new Map();
        this.eventBus = eventBus;
    }

    /**
     * Creates a new comment.
     * @param taskId The ID of the parent task.
     * @param authorId The ID of the author.
     * @param body The comment text.
     * @param taskTitle The title of the task (needed for event payload, passed by router).
     * @param authorName The name of the author (needed for event payload, passed by router).
     * @param taskAssigneeId The ID of the task assignee (needed for event payload, passed by router).
     * @returns The newly created comment.
     */
    create(taskId: string, authorId: string, body: string, taskTitle: string, authorName: string, taskAssigneeId: string | null): Comment {
        const newComment: Comment = {
            id: randomUUID(),
            taskId,
            authorId,
            body,
            createdAt: new Date().toISOString(),
        };
        this.commentStore.set(newComment.id, newComment);

        this.eventBus.publish("comment.added", {
            commentId: newComment.id,
            taskId: newComment.taskId,
            taskTitle,
            authorId: newComment.authorId,
            authorName,
            taskAssigneeId,
        });

        return newComment;
    }

    /**
     * Retrieves a comment by its ID.
     * @param id The ID of the comment.
     * @returns The comment, or undefined if not found.
     */
    getById(id: string): Comment | undefined {
        return this.commentStore.get(id);
    }

    /**
     * Retrieves all comments for a given task.
     * @param taskId The ID of the task.
     * @returns An array of comments belonging to the task.
     */
    getByTask(taskId: string): Comment[] {
        return Array.from(this.commentStore.values()).filter(comment => comment.taskId === taskId);
    }

    /**
     * Deletes a comment by its ID.
     * @param id The ID of the comment to delete.
     * @returns True if the comment was deleted, false otherwise.
     */
    delete(id: string): boolean {
        return this.commentStore.delete(id);
    }
}
