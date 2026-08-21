import { randomBytes } from 'crypto';
import { EventBus } from './event-bus';
import { Task } from './task-service';

export interface Notification {
    id: string;
    userId: string;
    message: string;
    read: boolean;
    createdAt: Date;
}

interface CommentAddedPayload {
    id: string;
    taskId: string;
    authorId: string;
    text: string;
    createdAt: Date;
    taskAssigneeId?: string;
}

export class NotificationService {
    private notifications: Map<string, Notification> = new Map();

    constructor(private eventBus: EventBus) {
        this.eventBus.subscribe('task.assigned', this.handleTaskAssigned.bind(this));
        this.eventBus.subscribe('task.status.changed', this.handleTaskStatusChanged.bind(this));
        this.eventBus.subscribe('comment.added', this.handleCommentAdded.bind(this));
    }

    private createNotification(userId: string, message: string) {
        const id = randomBytes(16).toString('hex');
        const notification: Notification = {
            id,
            userId,
            message,
            read: false,
            createdAt: new Date(),
        };
        this.notifications.set(id, notification);
    }

    getNotificationsForUser(userId: string): Notification[] {
        return Array.from(this.notifications.values())
            .filter(n => n.userId === userId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    markAsRead(notificationId: string): Notification | undefined {
        const notification = this.notifications.get(notificationId);
        if (notification) {
            notification.read = true;
            this.notifications.set(notificationId, notification);
        }
        return notification;
    }

    private handleTaskAssigned(payload: { taskId: string, assigneeId: string, projectId: string }) {
        const { taskId, assigneeId } = payload;
        const message = `You have been assigned a new task (ID: ${taskId}).`;
        this.createNotification(assigneeId, message);
    }

    private handleTaskStatusChanged(payload: { taskId: string, status: string, assigneeId?: string }) {
        const { taskId, status, assigneeId } = payload;
        if (assigneeId) {
            const message = `The status of your assigned task (ID: ${taskId}) has been updated to "${status}".`;
            this.createNotification(assigneeId, message);
        }
    }

    private handleCommentAdded(payload: CommentAddedPayload) {
        const { taskId, authorId, taskAssigneeId } = payload;
        if (taskAssigneeId && taskAssigneeId !== authorId) {
            const message = `A new comment was added to a task assigned to you (ID: ${taskId}).`;
            this.createNotification(taskAssigneeId, message);
        }
    }
}
