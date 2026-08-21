import crypto from 'crypto';
import { eventBus } from '../event-bus';

export interface Comment {
    id: string;
    taskId: string;
    authorId: string;
    body: string;
    createdAt: string;
}

export interface CreateCommentInput {
    taskId: string;
    authorId: string;
    body: string;
}

export class CommentService {
    private comments: Map<string, Comment> = new Map();

    createComment(
        input: CreateCommentInput, 
        taskTitle: string, 
        authorName: string, 
        taskAssigneeId: string | null
    ): Comment {
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const comment: Comment = { id, ...input, createdAt };
        this.comments.set(id, comment);

        if (taskAssigneeId) {
             eventBus.publish('comment.added', {
                commentId: comment.id,
                taskId: comment.taskId,
                taskTitle: taskTitle,
                authorId: comment.authorId,
                authorName: authorName,
                taskAssigneeId: taskAssigneeId,
            });
        }

        return comment;
    }

    getComment(id: string): Comment | undefined {
        return this.comments.get(id);
    }

    listCommentsByTask(taskId: string): Comment[] {
        return Array.from(this.comments.values()).filter(comment => comment.taskId === taskId);
    }

    deleteComment(id: string): boolean {
        return this.comments.delete(id);
    }
}
