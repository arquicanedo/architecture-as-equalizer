import * as crypto from 'crypto';
import {
    Notification,
    INotificationService,
    IEventBus,
    TaskAssignedPayload,
    TaskStatusChangedPayload,
    CommentAddedPayload,
    ITaskService
} from '../contracts';

export class NotificationService implements INotificationService {
    private readonly notifications = new Map<string, Notification>();

    constructor(private readonly eventBus: IEventBus, private readonly taskService: ITaskService) {
        this.subscribeToEvents();
    }

    private subscribeToEvents(): void {
        this.eventBus.subscribe('task.assigned', (payload) => this.handleTaskAssigned(payload as TaskAssignedPayload));
        this.eventBus.subscribe('task.statusChanged', (payload) => this.handleTaskStatusChanged(payload as TaskStatusChangedPayload));
        this.eventBus.subscribe('comment.added', (payload) => this.handleCommentAdded(payload as CommentAddedPayload));
    }

    private handleTaskAssigned(payload: TaskAssignedPayload): void {
        const message = `Task '${payload.taskTitle}' has been assigned to you.`;
        this.create({ userId: payload.assigneeId, message });
    }

    private handleTaskStatusChanged(payload: TaskStatusChangedPayload): void {
        if (payload.assigneeId) {
            const message = `Task '${payload.taskTitle}' status changed from '${payload.oldStatus}' to '${payload.newStatus}'.`;
            this.create({ userId: payload.assigneeId, message });
        }
    }

    private handleCommentAdded(payload: CommentAddedPayload): void {
        const task = this.taskService.getById(payload.taskId);
        // Only notify if there is an assignee and the commenter is not the assignee
        if (task && task.assigneeId && task.assigneeId !== payload.authorId) {
            const message = `A new comment was added to task '${payload.taskTitle}' by ${payload.authorName}.`;
            this.create({ userId: task.assigneeId, message });
        }
    }

    private create(input: { userId: string; message: string }): Notification {
        const id = crypto.randomUUID();
        const notification: Notification = {
            id,
            ...input,
            read: false,
            createdAt: new Date().toISOString(),
        };
        this.notifications.set(id, notification);
        return notification;
    }

    getByUser(userId: string): Notification[] {
        return Array.from(this.notifications.values()).filter(
            (n) => n.userId === userId && !n.read
        );
    }

    markAsRead(notificationId: string): Notification {
        const notification = this.notifications.get(notificationId);
        if (!notification) {
            throw new Error(`Notification with id ${notificationId} not found`);
        }
        notification.read = true;
        return notification;
    }
}
