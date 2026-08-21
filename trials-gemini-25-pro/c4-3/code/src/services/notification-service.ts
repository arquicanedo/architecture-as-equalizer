import crypto from 'crypto';
import { eventBus } from '../event-bus';
import { TaskStatus } from './task-service';

export interface Notification {
    id: string;
    userId: string;
    message: string;
    read: boolean;
    createdAt: string;
}

class NotificationService {
    private readonly notifications = new Map<string, Notification>();

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

    private handleTaskAssigned(payload: { taskId: string; taskTitle: string; assigneeId: string | null }) {
        if (payload.assigneeId) {
            const message = `You have been assigned to task "${payload.taskTitle}"`;
            this.createNotification(payload.assigneeId, message);
        }
    }

    private handleTaskStatusChanged(payload: { taskId: string; taskTitle: string; assigneeId: string | null; oldStatus: TaskStatus; newStatus: TaskStatus }) {
        if (payload.assigneeId) {
            const message = `The status of task "${payload.taskTitle}" has changed from ${payload.oldStatus} to ${payload.newStatus}`;
            this.createNotification(payload.assigneeId, message);
        }
    }

    private handleCommentAdded(payload: { commentId: string; taskId: string; taskTitle: string; authorId: string; authorName: string }) {
        // This is a simplification. In a real system, we'd look up the task
        // to find the assignee and notify them, but we can't call TaskService.
        // We'll assume the notification goes to the comment author for now.
        // A better approach would be for the task service to publish a more complete event.
        // Or for the notification service to be able to query for task details.
        // Given the constraints, we will notify the author of the comment.
        const message = `Your comment was added to task "${payload.taskTitle}"`;
        this.createNotification(payload.authorId, message);
    }

    getByUser(userId: string): Notification[] {
        return Array.from(this.notifications.values()).filter(n => n.userId === userId && !n.read);
    }

    markAsRead(id: string): Notification | undefined {
        const notification = this.notifications.get(id);
        if (notification) {
            notification.read = true;
            this.notifications.set(id, notification);
            return notification;
        }
        return undefined;
    }

}

export const notificationService = new NotificationService();
