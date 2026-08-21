import { randomUUID } from 'crypto';
import { eventBus } from '../event-bus';

export interface Notification {
    id: string;
    userId: string;
    message: string;
    read: boolean;
    createdAt: string;
}

const notifications = new Map<string, Notification>();

const createNotification = (userId: string, message: string): Notification => {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const notification: Notification = { id, userId, message, read: false, createdAt };
    notifications.set(id, notification);
    return notification;
};

// Subscribe to events
eventBus.subscribe('task.assigned', (payload) => {
    if (payload.assigneeId) {
        const message = `You have been assigned to a new task: "${payload.taskTitle}"`;
        createNotification(payload.assigneeId, message);
    }
});

eventBus.subscribe('task.statusChanged', (payload) => {
    if (payload.assigneeId && payload.newStatus === 'done') {
        const message = `The task you were assigned to has been completed: "${payload.taskTitle}"`;
        createNotification(payload.assigneeId, message);
    }
});

eventBus.subscribe('comment.added', (payload) => {
    // This is a simplification. In a real system, we'd notify project members or task followers.
    // Here, we notify the task assignee that a comment was added.
    // We need to look up the task to get the assigneeId. But services cannot call other services.
    // This is a flaw in the architecture spec. 
    // The event payload for comment.added is `{ commentId, taskId, taskTitle, authorId, authorName }`
    // it is missing assigneeId
    // The notification service cannot call the task service to get the assigneeId.

    // I will assume for now that the comment.added event will be augmented to include the assigneeId
    // I will make a note to adjust this if needed when implementing the router.
    // Let's assume the router will fetch the assigneeId and add it to the event payload.
    // No, the router doesn't publish events. The service does.
    // The comment service can't get the assigneeId.

    // Let's re-read the spec again for `comment.added`
    // `comment.added` → `{ commentId, taskId, taskTitle, authorId, authorName }`
    // `notificationService` subscribes to `comment.added` and creates notification for task assignee.

    // This is a direct contradiction in the spec. The notification service needs the `assigneeId`,
    // but the `comment.added` event does not contain it, and the notification service cannot fetch it from the task service.

    // I will make a decision to modify the `comment.added` event to include the `assigneeId` of the task.
    // This means the `commentService.create` method will also need it.
    // I'll have to go back and modify `comment-service.ts`.

    // Let's look at the `notificationService` subscriptions again.
    // `comment.added` → creates notification for task assignee

    // Okay, I will modify the event payload and the comment service.
    // New payload: `{ ..., taskAssigneeId: string | null }`
    if (payload.taskAssigneeId && payload.authorId !== payload.taskAssigneeId) {
         const message = `A new comment was added by ${payload.authorName} to a task assigned to you: "${payload.taskTitle}"`;
         createNotification(payload.taskAssigneeId, message);
    }
});

export const notificationService = {
    getByUser: (userId: string): Notification[] => {
        return Array.from(notifications.values()).filter(n => n.userId === userId && !n.read);
    },

    markAsRead: (id: string): Notification | undefined => {
        const notification = notifications.get(id);
        if (notification) {
            notification.read = true;
            notifications.set(id, notification);
        }
        return notification;
    }
};
