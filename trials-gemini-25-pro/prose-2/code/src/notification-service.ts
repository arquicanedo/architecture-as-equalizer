import { Notification } from './types';
import { randomUUID } from 'crypto';
import { eventBus } from './event-bus';
import { TaskService } from './task-service';

export class NotificationService {
    private notifications: Map<string, Notification> = new Map();

    constructor(private taskService: TaskService) { }

    setupSubscriptions() {
        eventBus.subscribe('task.assigned', (payload) => {
            const { taskId, assigneeId } = payload;
            const task = this.taskService.getTask(taskId);
            if (task && assigneeId) {
                const message = `You have been assigned to task: "${task.title}"`;
                this.createNotification(assigneeId, message);
            }
        });

        eventBus.subscribe('task.statusChanged', (payload) => {
            const { taskId, status, assigneeId } = payload;
            const task = this.taskService.getTask(taskId);
            if (task && assigneeId) {
                const message = `Task "${task.title}" status changed to "${status}"`;
                this.createNotification(assigneeId, message);
            }
        });

        eventBus.subscribe('comment.added', (payload) => {
            const { taskId, authorId, text } = payload;
            const task = this.taskService.getTask(taskId);
            if (task && task.assigneeId && task.assigneeId !== authorId) {
                const message = `New comment on task "${task.title}": "${text}"`;
                this.createNotification(task.assigneeId, message);
            }
        });
    }

    private createNotification(userId: string, message: string): Notification {
        const id = randomUUID();
        const createdAt = new Date();
        const notification: Notification = { id, userId, message, read: false, createdAt };
        this.notifications.set(id, notification);
        return notification;
    }

    getNotificationsForUser(userId: string): Notification[] {
        return Array.from(this.notifications.values()).filter(n => n.userId === userId && !n.read);
    }

    markAsRead(notificationId: string): Notification | undefined {
        const notification = this.notifications.get(notificationId);
        if (notification) {
            notification.read = true;
        }
        return notification;
    }
}
