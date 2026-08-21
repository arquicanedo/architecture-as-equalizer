import { Comment, UUID, CommentAddedEvent } from '../types';
import { randomUUID } from 'crypto';
import { eventBus } from '../event-bus';

class CommentService {
    private comments: Map<UUID, Comment>;

    constructor() {
        this.comments = new Map<UUID, Comment>();
    }

    /**
     * Creates a new comment.
     * @param taskId The ID of the parent task.
     * @param authorId The ID of the author.
     * @param body The comment text.
     * @returns The newly created comment.
     */
    create(taskId: UUID, authorId: UUID, body: string): Comment {
        if (!taskId || !authorId || !body) {
            throw new Error("Task ID, author ID, and comment body are required.");
        }
        const id: UUID = randomUUID();
        const newComment: Comment = {
            id,
            taskId,
            authorId,
            body,
            createdAt: new Date().toISOString()
        };
        this.comments.set(id, newComment);

        const payload: CommentAddedEvent = {
            commentId: newComment.id,
            taskId: newComment.taskId,
            authorId: newComment.authorId
        };
        eventBus.publish('comment.added', payload);

        return newComment;
    }

    /**
     * Retrieves comments for a specific task.
     * @param taskId The ID of the task.
     * @returns An array of comments for the task.
     */
    getByTask(taskId: UUID): Comment[] {
        return Array.from(this.comments.values()).filter(comment => comment.taskId === taskId);
    }

    /**
     * Retrieves a comment by its ID.
     * @param id The comment's UUID.
     * @returns The comment, or undefined if not found.
     */
    getById(id: UUID): Comment | undefined {
        return this.comments.get(id);
    }

    /**
     * Deletes a comment by its ID.
     * @param id The ID of the comment to delete.
     * @returns True if the comment was deleted, false otherwise.
     */
    delete(id: UUID): boolean {
        return this.comments.delete(id);
    }
}

export const commentService = new CommentService();
