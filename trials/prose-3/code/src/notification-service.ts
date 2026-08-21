import { randomUUID } from 'crypto';
import { Notification, EventPayloadMap } from './types';
import { EventBus } from './event-bus';

export class NotificationService {
  private notifications: Map<string, Notification> = new Map();

  constructor(private readonly eventBus: EventBus) {
    this.registerSubscriptions();
  }

  // ─── Event Subscriptions ──────────────────────────────────────────────────

  private registerSubscriptions(): void {
    // Notify the assignee when a task is assigned to them.
    this.eventBus.subscribe('task.assigned', (payload: EventPayloadMap['task.assigned']) => {
      this.createNotification(
        payload.assigneeId,
        `You have been assigned to task "${payload.taskTitle}".`
      );
    });

    // Notify the assignee when a task's status changes (if there is one).
    this.eventBus.subscribe(
      'task.status_changed',
      (payload: EventPayloadMap['task.status_changed']) => {
        if (payload.assigneeId) {
          this.createNotification(
            payload.assigneeId,
            `Task "${payload.taskTitle}" status changed from "${payload.oldStatus}" to "${payload.newStatus}".`
          );
        }
      }
    );

    // Notify the task's assignee when a new comment is added (but not if the
    // author is the assignee — no self-notification).
    this.eventBus.subscribe('comment.added', (payload: EventPayloadMap['comment.added']) => {
      if (payload.assigneeId && payload.assigneeId !== payload.authorId) {
        this.createNotification(
          payload.assigneeId,
          `New comment on task "${payload.taskTitle}": "${payload.body.substring(0, 80)}${payload.body.length > 80 ? '…' : ''}"`
        );
      }
    });
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────

  private createNotification(userId: string, message: string): Notification {
    const notification: Notification = {
      id: randomUUID(),
      userId,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(notification.id, notification);
    return notification;
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /** Return all notifications, optionally filtered by userId. */
  listNotifications(userId?: string): Notification[] {
    const all = Array.from(this.notifications.values());
    return userId ? all.filter((n) => n.userId === userId) : all;
  }

  /** Return a single notification by ID, or undefined if not found. */
  getNotificationById(id: string): Notification | undefined {
    return this.notifications.get(id);
  }

  /** Mark a notification as read. Throws if not found. */
  markAsRead(id: string): Notification {
    const notification = this.notifications.get(id);
    if (!notification) throw new Error(`Notification "${id}" not found.`);
    notification.read = true;
    return notification;
  }
}
