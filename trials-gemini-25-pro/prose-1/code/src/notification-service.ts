
import { Task } from "./task-service";
import { Comment } from "./comment-service";

export interface Notification {
    id: string;
    userId: string;
    message: string;
    read: boolean;
    createdAt: Date;
}

export class NotificationService {
    private notifications = new Map<string, Notification>();
    private nextId = 1;

    createNotification(userId: string, message: string): Notification {
        const id = `notif-${this.nextId++}`;
        const notification: Notification = { id, userId, message, read: false, createdAt: new Date() };
        this.notifications.set(id, notification);
        return notification;
    }

    getNotificationsForUser(userId: string): Notification[] {
        return Array.from(this.notifications.values()).filter(n => n.userId === userId && !n.read);
    }

    markAsRead(id: string): Notification | undefined {
        const notification = this.notifications.get(id);
        if (notification) {
            notification.read = true;
            return notification;
        }
        return undefined;
    }

    handleTaskAssigned(task: Task) {
        if (task.assigneeId) {
            this.createNotification(task.assigneeId, `You have been assigned to task: ${task.title}`);
        }
    }

    handleTaskStatusChanged(task: Task) {
        if (task.assigneeId) {
            this.createNotification(task.assigneeId, `Task '${task.title}' status changed to ${task.status}`);
        }
    }

    handleCommentAdded(comment: Comment) {
        // This is a simplification. In a real system, we'd look up the task
        // to find the assignee and other relevant users to notify.
        // For this example, we'll assume the author doesn't need a notification.
        // We will need to get the task from the task service to find the assignee.
        // This will be handled in the main.ts file by passing a callback to get the task.
    }
}
