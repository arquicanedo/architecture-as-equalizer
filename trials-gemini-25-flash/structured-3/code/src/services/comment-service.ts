import { randomUUID } from 'crypto';
import { eventBus } from '../event-bus';

export interface Comment {
    id: string;
    taskId: string;
    authorId: string;
    body: string;
    createdAt: number; // Unix timestamp
}

class CommentService {
    private comments: Map<string, Comment>;

    constructor() {
        this.comments = new Map();
    }

    /**
     * Creates a new comment for a task.
     * Publishes 'comment.added' event.
     * @param taskId The ID of the task the comment belongs to.
     * @param authorId The ID of the user who authored the comment.
     * @param body The content of the comment.
     * @param taskTitle The title of the task (needed for event payload, passed by caller).
     * @param authorName The name of the author (needed for event payload, passed by caller).
     * @returns The created comment.
     */
    create(taskId: string, authorId: string, body: string, taskTitle: string, authorName: string): Comment {
        if (!taskId || !authorId || !body) {
            throw new Error('Task ID, Author ID, and comment body are required.');
        }
        const id = randomUUID();
        const newComment: Comment = {
            id,
            taskId,
            authorId,
            body,
            createdAt: Date.now(),
        };
        this.comments.set(id, newComment);
        eventBus.publish('comment.added', { commentId: newComment.id, taskId, taskTitle, authorId, authorName });
        return newComment;
    }

    /**
     * Retrieves all comments for a given task.
     * @param taskId The ID of the task.
     * @returns An array of comments belonging to the task.
     */
    getByTask(taskId: string): Comment[] {
        return Array.from(this.comments.values()).filter(comment => comment.taskId === taskId);
    }

    /**
     * Retrieves a comment by its ID.
     * @param id The ID of the comment.
     * @returns The comment, or undefined if not found.
     */
    getById(id: string): Comment | undefined {
        return this.comments.get(id);
    }

    /**
     * Deletes a comment by its ID.
     * @param id The ID of the comment to delete.
     * @returns True if the comment was deleted, false otherwise.
     */
    delete(id: string): boolean {
        return this.comments.delete(id);
    }
}

export const commentService = new CommentService();
