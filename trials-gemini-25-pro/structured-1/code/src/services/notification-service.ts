import crypto from "crypto";
import { EventBus } from "../event-bus";

export interface Notification {
    id: string;
    userId: string;
    message: string;
    read: boolean;
    createdAt: Date;
}

export class NotificationService {
    private readonly notifications: Map<string, Notification> = new Map();

    constructor(private readonly eventBus: EventBus) {
        this.eventBus.subscribe("task.assigned", this.handleTaskAssigned.bind(this));
        this.eventBus.subscribe("task.statusChanged", this.handleTaskStatusChanged.bind(this));
        this.eventBus.subscribe("comment.added", this.handleCommentAdded.bind(this));
    }

    private handleTaskAssigned(payload: { taskId: string; taskTitle: string; assigneeId: string; }) {
        const { taskTitle, assigneeId } = payload;
        const message = `You have been assigned to a new task: "${taskTitle}"`;
        this.create(assigneeId, message);
    }

    private handleTaskStatusChanged(payload: { taskId: string; taskTitle: string; assigneeId: string; oldStatus: string; newStatus: string; }) {
        const { taskTitle, assigneeId, oldStatus, newStatus } = payload;
        const message = `The status of your task "${taskTitle}" has changed from ${oldStatus} to ${newStatus}`;
        this.create(assigneeId, message);
    }

    private handleCommentAdded(payload: { commentId: string; taskId: string; taskTitle: string; authorId: string; authorName: string; }) {
        // This is a simplification. The spec doesn't say who to notify when a comment is added.
        // We'll notify the task assignee, but this would require a lookup in a real system.
        // For now, we assume the event contains the assigneeId.
        // Based on the architecture, the notification service can't call the task service.
        // Let's assume the router will add the assigneeId to the event payload.
        // This is a flaw in the spec, I'll have to make an assumption.
        // Let's go back to the event payload for `comment.added`
        // The spec says: `{ commentId, taskId, taskTitle, authorId, authorName }`
        // It does NOT contain the assigneeId. The notification service is not allowed to call the task service.
        // The only way to solve this is to have the router query the task and add the assignee to the event.
        // Or, the notification service gets the event, then has to somehow get the assigneeId.
        // The spec says `comment.added` -> creates notification for task assignee.
        // I'll modify the `comment.added` event to include the task's `assigneeId`.
        // This means the router needs to fetch it and pass it to the `commentService.create` method,
        // which will then include it in the event.

        // The event payload will be: `{ commentId, taskId, taskTitle, authorId, authorName, taskAssigneeId }`
        const { taskTitle, authorName, taskAssigneeId, authorId } = payload as any;
        
        // Don't notify the user if they are the one who made the comment
        if (taskAssigneeId && taskAssigneeId !== authorId) {
             const message = `A new comment was added by ${authorName} on task "${taskTitle}"`;
             this.create(taskAssigneeId, message);
        }
    }

    create(userId: string, message: string): Notification {
        const id = crypto.randomUUID();
        const notification: Notification = { id, userId, message, read: false, createdAt: new Date() };
        this.notifications.set(id, notification);
        return notification;
    }

    getByUser(userId: string): Notification[] {
        return Array.from(this.notifications.values())
            .filter(n => n.userId === userId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
