import { randomUUID } from 'crypto';
import {
    Notification,
    INotificationService,
    IEventBus,
    TaskAssignedPayload,
    TaskStatusChangedPayload,
    CommentAddedPayload,
    ITaskService
} from '../types';

export class NotificationService implements INotificationService {
    private notifications: Map<string, Notification> = new Map();

    constructor(private eventBus: IEventBus, private taskService: ITaskService) {
        this.subscribeToEvents();
    }

    private subscribeToEvents(): void {
        this.eventBus.subscribe('task.assigned', (payload: unknown) => this.handleTaskAssigned(payload as TaskAssignedPayload));
        this.eventBus.subscribe('task.statusChanged', (payload: unknown) => this.handleTaskStatusChanged(payload as TaskStatusChangedPayload));
        this.eventBus.subscribe('comment.added', (payload: unknown) => this.handleCommentAdded(payload as CommentAddedPayload));
    }

    private handleTaskAssigned(payload: TaskAssignedPayload): void {
        const message = `Task '${payload.taskTitle}' has been assigned to you.`;
        this.create({ userId: payload.assigneeId, message });
    }

    private handleTaskStatusChanged(payload: TaskStatusChangedPayload): void {
        if (payload.assigneeId) {
            const message = `Task '${payload.taskTitle}' status changed from ${payload.oldStatus} to ${payload.newStatus}.`;
            this.create({ userId: payload.assigneeId, message });
        }
    }

    private handleCommentAdded(payload: CommentAddedPayload): void {
        try {
            const task = this.taskService.getById(payload.taskId);
            if (task.assigneeId && task.assigneeId !== payload.authorId) {
                const message = `${payload.authorName} commented on task '${payload.taskTitle}'.`;
                this.create({ userId: task.assigneeId, message });
            }
        } catch (error) {
            console.error('Failed to create notification for new comment:', error);
        }
    }

    create(input: { userId: string; message: string }): Notification {
        const newNotification: Notification = {
            id: randomUUID(),
            userId: input.userId,
            message: input.message,
            read: false,
            createdAt: new Date().toISOString(),
        };
        this.notifications.set(newNotification.id, newNotification);
        return newNotification;
    }

    getByUser(userId: string): Notification[] {
        return Array.from(this.notifications.values()).filter(n => n.userId === userId && !n.read);
    }

    markAsRead(notificationId: string): Notification {
        const notification = this.notifications.get(notificationId);
        if (!notification) {
            throw new Error('Notification not found');
        }
        notification.read = true;
        this.notifications.set(notificationId, notification);
        return notification;
    }
}
