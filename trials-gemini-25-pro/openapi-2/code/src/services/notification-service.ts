import crypto from 'crypto';
import { eventBus } from '../event-bus';

export interface Notification {
    id: string;
    userId: string;
    message: string;
    read: boolean;
    createdAt: string;
}

export class NotificationService {
    private notifications: Map<string, Notification> = new Map();

    constructor() {
        eventBus.subscribe('task.assigned', this.handleTaskAssigned.bind(this));
        eventBus.subscribe('task.statusChanged', this.handleTaskStatusChanged.bind(this));
        eventBus.subscribe('comment.added', this.handleCommentAdded.bind(this));
    }

    private createNotification(userId: string, message: string): Notification {
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const notification: Notification = { id, userId, message, read: false, createdAt };
        this.notifications.set(id, notification);
        return notification;
    }

    private handleTaskAssigned(payload: { taskId: string; taskTitle: string; assigneeId: string }): void {
        const { taskTitle, assigneeId } = payload;
        const message = `You have been assigned to a new task: "${taskTitle}"`;
        this.createNotification(assigneeId, message);
    }

    private handleTaskStatusChanged(payload: { taskId: string; taskTitle: string; assigneeId: string; oldStatus: string; newStatus: string }): void {
        const { taskTitle, assigneeId, oldStatus, newStatus } = payload;
        const message = `The status of your task "${taskTitle}" has changed from ${oldStatus} to ${newStatus}`;
        this.createNotification(assigneeId, message);
    }

    private handleCommentAdded(payload: { commentId: string; taskId: string; taskTitle: string; authorId: string; authorName: string; taskAssigneeId: string }): void {
        const { taskTitle, authorName, taskAssigneeId, authorId } = payload;
        // Notify the task assignee, but not if they are the author of the comment.
        if (taskAssigneeId && taskAssigneeId !== authorId) {
            const message = `A new comment by "${authorName}" was added to your task "${taskTitle}"`;
            this.createNotification(taskAssigneeId, message);
        }
    }

    listNotificationsForUser(userId: string): Notification[] {
        return Array.from(this.notifications.values())
            .filter(n => n.userId === userId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    markNotificationAsRead(id: string): Notification | undefined {
        const notification = this.notifications.get(id);
        if (notification) {
            notification.read = true;
            this.notifications.set(id, notification);
        }
        return notification;
    }
}
