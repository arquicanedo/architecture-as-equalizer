import { randomUUID } from 'crypto';
import { eventBus } from '../event-bus';

export interface Comment {
    id: string;
    taskId: string;
    authorId: string;
    body: string;
    createdAt: string;
}

const comments = new Map<string, Comment>();

export const commentService = {
    create: (data: { taskId: string; authorId: string; body: string; taskTitle: string; authorName: string; taskAssigneeId: string | null; }): Comment => {
        const id = randomUUID();
        const createdAt = new Date().toISOString();
        const newComment: Comment = { 
            id, 
            taskId: data.taskId, 
            authorId: data.authorId, 
            body: data.body, 
            createdAt 
        };
        comments.set(id, newComment);

        eventBus.publish('comment.added', {
            commentId: id,
            taskId: data.taskId,
            taskTitle: data.taskTitle,
            authorId: data.authorId,
            authorName: data.authorName,
            taskAssigneeId: data.taskAssigneeId
        });

        return newComment;
    },

    getById: (id: string): Comment | undefined => {
        return comments.get(id);
    },

    getByTask: (taskId: string): Comment[] => {
        return Array.from(comments.values()).filter(comment => comment.taskId === taskId);
    },

    delete: (id: string): boolean => {
        return comments.delete(id);
    }
};
