import { randomUUID } from 'crypto';
import { EventBus } from '../event-bus';

/**
 * @deprecated Use `src/types/notification.ts` once type definitions are centralized
 */
export interface Notification {
    id: string;
    userId: string;
    message: string;
    read: boolean;
    createdAt: string;
}

/**
 * Creates and manages notifications based on events from the Event Bus.
 * Adheres to ADR-002: Service-Owned Data Stores.
 */
export class NotificationService {
    private notifStore: Map<string, Notification>;
    private eventBus: EventBus;

    constructor(eventBus: EventBus) {
        this.notifStore = new Map();
        this.eventBus = eventBus;
        this.subscribeToEvents();
    }

    private subscribeToEvents(): void {
        this.eventBus.subscribe("task.assigned", (payload: {
            taskId: string;
            taskTitle: string;
            assigneeId: string;
        }) => {
            if (payload.assigneeId) {
                this.createNotification(payload.assigneeId,
                    `You have been assigned to task "${payload.taskTitle}" (Task ID: ${payload.taskId}).`);
            }
        });

        this.eventBus.subscribe("task.statusChanged", (payload: {
            taskId: string;
            taskTitle: string;
            assigneeId: string | null;
            oldStatus: string;
            newStatus: string;
        }) => {
            if (payload.assigneeId) {
                this.createNotification(payload.assigneeId,
                    `The status of task "${payload.taskTitle}" (Task ID: ${payload.taskId}) changed from ${payload.oldStatus} to ${payload.newStatus}.`);
            }
        });

        this.eventBus.subscribe("comment.added", (payload: {
            commentId: string;
            taskId: string;
            taskTitle: string;
            authorId: string;
            authorName: string;
            taskAssigneeId?: string; // Expecting this to be present based on implied requirement
        }) => {
            // Notify the task assignee when a comment is added
            if (payload.taskAssigneeId && payload.taskAssigneeId !== payload.authorId) {
                this.createNotification(payload.taskAssigneeId,
                    `New comment by ${payload.authorName} on task "${payload.taskTitle}" (Task ID: ${payload.taskId}).`);
            }
        });
    }

    private createNotification(userId: string, message: string): Notification {
        const newNotification: Notification = {
            id: randomUUID(),
            userId,
            message,
            read: false,
            createdAt: new Date().toISOString(),
        };
        this.notifStore.set(newNotification.id, newNotification);
        return newNotification;
    }

    /**
     * Retrieves all notifications for a specific user.
     * @param userId The ID of the user.
     * @returns An array of notifications for the user.
     */
    getByUser(userId: string): Notification[] {
        return Array.from(this.notifStore.values()).filter(notif => notif.userId === userId);
    }

    /**
     * Marks a notification as read.
     * @param id The ID of the notification to mark as read.
     * @returns The updated notification, or undefined if not found.
     */
    markAsRead(id: string): Notification | undefined {
        const notification = this.notifStore.get(id);
        if (!notification) {
            return undefined;
        }
        notification.read = true;
        this.notifStore.set(id, notification);
        return { ...notification };
    }
}
