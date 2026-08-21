import { randomUUID } from "crypto";
import { EventBus } from "./event-bus";
import { Notification } from "./types";

/**
 * NotificationService — owns all notification data.
 *
 * Subscribes to:
 *   • task.assigned      → notifies the new assignee
 *   • task.statusChanged → notifies the assignee (if any) of the status change
 *   • comment.added      → notifies the task's assignee (if different from author)
 *   • member.added       → notifies the user that they joined a project
 *
 * All subscriptions are wired up in the constructor.
 */
export class NotificationService {
  private notifications: Map<string, Notification> = new Map();

  constructor(eventBus: EventBus) {
    // ── Subscribe to events ──────────────────────────────────────────────────

    eventBus.subscribe("task.assigned", (payload) => {
      this.createNotification(
        payload.assigneeId,
        `You have been assigned to task "${payload.taskTitle}"`
      );
    });

    eventBus.subscribe("task.statusChanged", (payload) => {
      if (payload.assigneeId) {
        this.createNotification(
          payload.assigneeId,
          `Task "${payload.taskTitle}" status changed from "${payload.oldStatus}" to "${payload.newStatus}"`
        );
      }
    });

    eventBus.subscribe("comment.added", (payload) => {
      // Notify the assignee only when they are NOT the author of the comment
      if (
        payload.assigneeId &&
        payload.assigneeId !== payload.authorId
      ) {
        this.createNotification(
          payload.assigneeId,
          `New comment on task "${payload.taskTitle}": "${payload.body.slice(0, 80)}${payload.body.length > 80 ? "…" : ""}"`
        );
      }
    });

    eventBus.subscribe("member.added", (payload) => {
      this.createNotification(
        payload.userId,
        `You have been added to project "${payload.projectName}"`
      );
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

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

  getNotificationsForUser(userId: string): Notification[] {
    return Array.from(this.notifications.values())
      .filter((n) => n.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }

  getAllNotifications(): Notification[] {
    return Array.from(this.notifications.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  markAsRead(id: string): Notification {
    const notification = this.notifications.get(id);
    if (!notification) throw new Error(`Notification "${id}" not found`);

    const updated: Notification = { ...notification, read: true };
    this.notifications.set(id, updated);
    return updated;
  }
}
