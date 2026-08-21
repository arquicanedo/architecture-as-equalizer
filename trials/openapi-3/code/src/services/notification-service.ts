import { randomUUID } from 'crypto';
import { eventBus } from '../event-bus.js';
import type {
  Notification,
  TaskAssignedPayload,
  TaskStatusChangedPayload,
  CommentAddedPayload,
} from '../types.js';

// ─── Notification Service ─────────────────────────────────────────────────────
// Owns the notification store exclusively. Reacts to events from the Event Bus.
// Does NOT call other services directly.

class NotificationService {
  private store: Map<string, Notification> = new Map();

  constructor() {
    // Wire up event subscriptions at construction time.
    // The service is self-contained: it registers its own handlers.
    eventBus.subscribe('task.assigned', (payload) => {
      this.onTaskAssigned(payload as TaskAssignedPayload);
    });

    eventBus.subscribe('task.statusChanged', (payload) => {
      this.onTaskStatusChanged(payload as TaskStatusChangedPayload);
    });

    eventBus.subscribe('comment.added', (payload) => {
      this.onCommentAdded(payload as CommentAddedPayload);
    });
  }

  // ── Event Handlers ──────────────────────────────────────────────────────────

  private onTaskAssigned(payload: TaskAssignedPayload): void {
    this.createNotification(
      payload.assigneeId,
      `You have been assigned to task "${payload.taskTitle}" (${payload.taskId}).`,
    );
  }

  private onTaskStatusChanged(payload: TaskStatusChangedPayload): void {
    // Only notify if there is an assignee on the task
    if (!payload.assigneeId) return;

    this.createNotification(
      payload.assigneeId,
      `Task "${payload.taskTitle}" status changed from "${payload.oldStatus}" to "${payload.newStatus}".`,
    );
  }

  private onCommentAdded(payload: CommentAddedPayload): void {
    // Notify the author that their comment was recorded
    // (In a real system you'd notify the task owner/assignee instead,
    //  but we only have the authorId available without cross-service lookup.)
    this.createNotification(
      payload.authorId,
      `${payload.authorName} commented on task "${payload.taskTitle}": comment ${payload.commentId}.`,
    );
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  listForUser(userId: string): Notification[] {
    return Array.from(this.store.values()).filter((n) => n.userId === userId);
  }

  markRead(id: string): Notification | undefined {
    const notification = this.store.get(id);
    if (!notification) return undefined;

    const updated: Notification = { ...notification, read: true };
    this.store.set(id, updated);
    return updated;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private createNotification(userId: string, message: string): Notification {
    const notification: Notification = {
      id: randomUUID(),
      userId,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.store.set(notification.id, notification);
    return notification;
  }
}

export const notificationService = new NotificationService();
