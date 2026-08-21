import { Notification, UUID, TaskAssignedEvent, TaskStatusChangedEvent, CommentAddedEvent } from '../types';
import { randomUUID } from 'crypto';
import { eventBus } from '../event-bus';

class NotificationService {
    private notifications: Map<UUID, Notification>;

    constructor() {
        this.notifications = new Map<UUID, Notification>();
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        eventBus.subscribe('task.assigned', (payload: TaskAssignedEvent) => this.handleTaskAssigned(payload));
        eventBus.subscribe('task.statusChanged', (payload: TaskStatusChangedEvent) => this.handleTaskStatusChanged(payload));
        eventBus.subscribe('comment.added', (payload: CommentAddedEvent) => this.handleCommentAdded(payload));
    }

    private createNotification(userId: UUID, message: string): Notification {
        const id: UUID = randomUUID();
        const newNotification: Notification = {
            id,
            userId,
            message,
            read: false,
            createdAt: new Date().toISOString()
        };
        this.notifications.set(id, newNotification);
        return newNotification;
    }

    private handleTaskAssigned(payload: TaskAssignedEvent): void {
        const { taskId, taskTitle, assigneeId } = payload;
        if (assigneeId) { // Only if assigned to an actual user
            const message = `Task "${taskTitle}" has been assigned to you. (Task ID: ${taskId})`;
            this.createNotification(assigneeId, message);
        }
    }

    private handleTaskStatusChanged(payload: TaskStatusChangedEvent): void {
        const { taskId, taskTitle, assigneeId, oldStatus, newStatus } = payload;
        if (assigneeId) { // Only if there's an assignee
            const message = `Status of task "${taskTitle}" changed from ${oldStatus} to ${newStatus}. (Task ID: ${taskId})`;
            this.createNotification(assigneeId, message);
        }
    }

    private handleCommentAdded(payload: CommentAddedEvent): void {
        const { commentId, taskId, authorId } = payload;
        // IMPORTANT: Due to "no direct service-to-service calls" constraint,
        // NotificationService cannot fetch task details (like assigneeId) or author name.
        // Thus, notifications for comments will be less specific.
        // It cannot notify the task assignee directly without breaking the rule.
        // It can only create a notification for the comment's author.
        // Or, it can create a general notification without a specific target, or for an admin.
        // For now, I will create a notification for the comment's author.

        // If the intent was to notify the task assignee, and the event *must* contain assigneeId,
        // then the architecture constraint regarding no direct service calls is implicitly violated,
        // or the CommentService's API needs to be changed to receive assigneeId.
        // Sticking to strict interpretation: cannot notify assignee unless event contains assigneeId.

        const message = `A new comment (ID: ${commentId}) was added to task (ID: ${taskId}) by user (ID: ${authorId}).`;
        this.createNotification(authorId, message);
        
        // If the intent was to notify the task assignee, and the event *must* contain assigneeId,
        // then the architecture constraint regarding no direct service calls is implicitly violated,
        // or the CommentService's API needs to be changed to receive assigneeId.
        // Sticking to strict interpretation: cannot notify assignee unless event contains assigneeId.
    }


    /**
     * Retrieves notifications for a specific user.
     * @param userId The ID of the user.
     * @returns An array of notifications for the user.
     */
    getByUser(userId: UUID): Notification[] {
        return Array.from(this.notifications.values()).filter(notif => notif.userId === userId);
    }

    /**
     * Marks a notification as read.
     * @param id The ID of the notification.
     * @returns The updated notification, or undefined if not found.
     */
    markAsRead(id: UUID): Notification | undefined {
        const notification = this.notifications.get(id);
        if (!notification) {
            return undefined;
        }
        notification.read = true;
        this.notifications.set(id, notification);
        return notification;
    }
}

export const notificationService = new NotificationService();
