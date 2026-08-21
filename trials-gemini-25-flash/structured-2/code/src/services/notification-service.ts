import { randomUUID } from 'crypto';
import { eventBus } from '../event-bus';

export interface Notification {
    id: string;
    userId: string;
    message: string;
    read: boolean;
    createdAt: number; // Unix timestamp
}

export class NotificationService {
    private notifications: Map<string, Notification>;

    constructor(eventBusInstance: typeof eventBus) {
        this.notifications = new Map();
        this.subscribeToEvents(eventBusInstance);
    }

    private createNotification(userId: string, message: string): Notification {
        const id = randomUUID();
        const newNotification: Notification = {
            id,
            userId,
            message,
            read: false,
            createdAt: Date.now()
        };
        this.notifications.set(id, newNotification);
        return newNotification;
    }

    private subscribeToEvents(eventBusInstance: typeof eventBus): void {
        eventBusInstance.subscribe('task.assigned', (payload: { taskId: string, taskTitle: string, assigneeId: string }) => {
            const message = `You have been assigned to task "${payload.taskTitle}".`;
            this.createNotification(payload.assigneeId, message);
            console.log(`Notification created for user ${payload.assigneeId}: ${message}`);
        });

        eventBusInstance.subscribe('task.statusChanged', (payload: { taskId: string, taskTitle: string, assigneeId: string, oldStatus: string, newStatus: string }) => {
            const message = `The status of your task "${payload.taskTitle}" changed from ${payload.oldStatus} to ${payload.newStatus}.`;
            this.createNotification(payload.assigneeId, message);
            console.log(`Notification created for user ${payload.assigneeId}: ${message}`);
        });

        eventBusInstance.subscribe('comment.added', (payload: { commentId: string, taskId: string, taskTitle: string, authorId: string, authorName: string, taskAssigneeId?: string }) => {
            // Notify the task assignee if they are not the comment author
            if (payload.taskAssigneeId && payload.taskAssigneeId !== payload.authorId) {
                const message = `${payload.authorName} commented on your task "${payload.taskTitle}".`;
                this.createNotification(payload.taskAssigneeId, message);
                console.log(`Notification created for user ${payload.taskAssigneeId}: ${message}`);
            }
        });
    }

    getByUser(userId: string): Notification[] {
        return Array.from(this.notifications.values()).filter(notification => notification.userId === userId);
    }

    markAsRead(id: string): Notification | undefined {
        const notification = this.notifications.get(id);
        if (notification) {
            notification.read = true;
            return notification;
        }
        return undefined;
    }
}
