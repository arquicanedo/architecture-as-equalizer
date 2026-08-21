import { randomUUID } from 'crypto';
import { eventBus } from '../event-bus';

export interface Notification {
    id: string;
    userId: string;
    message: string;
    read: boolean;
    createdAt: string;
}

export class NotificationService {
    private notifications: Map<string, Notification>;

    constructor() {
        this.notifications = new Map();
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        eventBus.subscribe('task.assigned', (payload: any) => {
            const { taskId, taskTitle, assigneeId } = payload;
            if (assigneeId) { // Only notify if assigned to someone
                const message = `Task \'${taskTitle}\' (ID: ${taskId}) has been assigned to you.`;
                this.createNotification(assigneeId, message);
            }
        });

        eventBus.subscribe('task.statusChanged', (payload: any) => {
            const { taskId, taskTitle, assigneeId, oldStatus, newStatus } = payload;
            if (assigneeId && oldStatus !== newStatus) { // Only notify if assigned and status changed
                const message = `Status of task \'${taskTitle}\' (ID: ${taskId}) changed from ${oldStatus} to ${newStatus}.`;
                this.createNotification(assigneeId, message);
            }
        });

        eventBus.subscribe('comment.added', (payload: any) => {
            const { commentId, taskId, taskTitle, authorId, authorName } = payload;
            // Notify the author of the task if different from comment author
            // This implies the NotificationService needs to know who the task is assigned to
            // However, the event payload for comment.added does not include assigneeId.
            // For simplicity, let's notify the task author/project members in a real system,
            // but given current constraints, we'll notify the author of the comment if task details are not easily available.
            // The architecture asks to notify the 'user' (singular), which implies the assignee.

            // Given the event `comment.added` payload: { commentId, taskId, taskTitle, authorId, authorName }
            // The NotificationService doesn't know who the task is assigned to based *only* on this event.
            // To avoid direct service calls, I will create a notification for the author of the comment, 
            // which is the only user ID directly available in the payload. 
            // A more robust solution would require the comment.added event to contain more context,
            // e.g., the task's assigneeId if there is one.

            const message = `New comment on task \'${taskTitle}\' (ID: ${taskId}) by ${authorName}.`;
            // For the demo, let's assume the assignee of the task should be notified.
            // Since `comment.added` doesn't contain `assigneeId`, the notification will go to the author of the comment.
            // This is a limitation due to the strict constraint and event payload definition.
            // If the spec means notify the task's assignee, the `comment.added` payload needs `assigneeId`.
            // For now, I'll send it to the author of the comment.
            this.createNotification(authorId, message);
        });
    }

    private createNotification(userId: string, message: string): Notification {
        const newNotification: Notification = {
            id: randomUUID(),
            userId: userId,
            message: message,
            read: false,
            createdAt: new Date().toISOString(),
        };
        this.notifications.set(newNotification.id, newNotification);
        return newNotification;
    }

    listNotifications(userId: string): Notification[] {
        return Array.from(this.notifications.values()).filter(notif => notif.userId === userId);
    }

    markNotificationAsRead(id: string): Notification | undefined {
        const notification = this.notifications.get(id);
        if (!notification) {
            return undefined;
        }
        notification.read = true;
        this.notifications.set(id, notification);
        return notification;
    }
}
