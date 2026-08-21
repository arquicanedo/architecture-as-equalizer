import { randomUUID } from 'crypto';
import { eventBus } from '../event-bus';

export interface Comment {
    id: string;
    taskId: string;
    authorId: string;
    body: string;
    createdAt: string;
}

class CommentService {
    private commentStore: Map<string, Comment> = new Map();

    create(
        taskId: string,
        authorId: string,
        body: string,
        // The router is expected to fetch and provide these details
        taskTitle: string,
        authorName: string
    ): Comment {
        const id = randomUUID();
        const createdAt = new Date().toISOString();
        const comment: Comment = { id, taskId, authorId, body, createdAt };
        this.commentStore.set(id, comment);

        eventBus.publish('comment.added', {
            commentId: comment.id,
            taskId: comment.taskId,
            taskTitle: taskTitle,
            authorId: comment.authorId,
            authorName: authorName,
        });

        return comment;
    }

    getById(id: string): Comment | undefined {
        return this.commentStore.get(id);
    }

    getByTask(taskId: string): Comment[] {
        return Array.from(this.commentStore.values()).filter(
            comment => comment.taskId === taskId
        );
    }

    delete(id: string): boolean {
        return this.commentStore.delete(id);
    }
}

export const commentService = new CommentService();
