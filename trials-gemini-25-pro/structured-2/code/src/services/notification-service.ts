import crypto from 'crypto';
import { EventBus } from '../event-bus';

export interface Notification {
    id: string;
    userId: string;
    message: string;
    read: boolean;
    createdAt: Date;
}

export class NotificationService {
    private notifications: Map<string, Notification> = new Map();

    constructor(private eventBus: EventBus) {
        this.eventBus.subscribe('task.assigned', this.handleTaskAssigned.bind(this));
        this.eventBus.subscribe('task.statusChanged', this.handleTaskStatusChanged.bind(this));
        this.eventBus.subscribe('comment.added', this.handleCommentAdded.bind(this));
    }

    private createNotification(userId: string, message: string): Notification {
        const id = crypto.randomUUID();
        const notification: Notification = {
            id,
            userId,
            message,
            read: false,
            createdAt: new Date(),
        };
        this.notifications.set(id, notification);
        return notification;
    }

    private handleTaskAssigned(payload: { taskId: string; taskTitle: string; assigneeId: string; }): void {
        const { taskTitle, assigneeId } = payload;
        const message = `You have been assigned to task: "${taskTitle}"`;
        this.createNotification(assigneeId, message);
    }

    private handleTaskStatusChanged(payload: { taskId: string; taskTitle: string; assigneeId: string; oldStatus: string; newStatus: string; }): void {
        const { taskTitle, assigneeId, oldStatus, newStatus } = payload;
        const message = `The status of your task "${taskTitle}" has changed from ${oldStatus} to ${newStatus}.`;
        this.createNotification(assigneeId, message);
    }

    private handleCommentAdded(payload: { commentId: string; taskId: string; taskTitle: string; authorName: string; taskAssigneeId: string; }): void {
        const { taskTitle, authorName, taskAssigneeId } = payload;
        // A user should not be notified of their own comments.
        // The event payload has authorId, but the handler only gets a subset.
        // This logic should be handled by the publisher or the event data.
        // For now, we assume the user to notify is the taskAssigneeId and it's not the author.
        const message = `New comment from ${authorName} on your task "${taskTitle}"`;
        this.createNotification(taskAssigneeId, message);
    }

    // Get by User
    getByUser(userId: string): Notification[] {
        return Array.from(this.notifications.values())
            .filter(n => n.userId === userId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // Mark as Read
    markAsRead(id: string): Notification | undefined {
        const notification = this.notifications.get(id);
        if (notification) {
            notification.read = true;
        }
        return notification;
    }
}
