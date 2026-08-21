/**
 * NotificationService — owns all notification data.
 *
 * Subscribes to domain events published by other services and creates
 * user-facing notifications.  It never calls other services directly.
 *
 * Subscribed events:
 *   • task.assigned      → notify the new assignee
 *   • task.statusChanged → notify the assignee (if any) of the new status
 *   • comment.added      → notify the task assignee when someone else comments
 */

import { randomUUID } from "crypto";
import type { EventBus } from "../event-bus.js";
import type {
  Notification,
  TaskAssignedPayload,
  TaskStatusChangedPayload,
  CommentAddedPayload,
} from "../types.js";

export class NotificationService {
  private readonly notifications: Map<string, Notification> = new Map();

  constructor(private readonly eventBus: EventBus) {
    this.registerSubscriptions();
  }

  // ── Event subscriptions ───────────────────────────────────────────────────

  private registerSubscriptions(): void {
    this.eventBus.subscribe<TaskAssignedPayload>(
      "task.assigned",
      (payload) => {
        this.createNotification(
          payload.assigneeId,
          `You have been assigned to task "${payload.taskTitle}".`
        );
      }
    );

    this.eventBus.subscribe<TaskStatusChangedPayload>(
      "task.statusChanged",
      (payload) => {
        if (!payload.assigneeId) return; // No one to notify
        this.createNotification(
          payload.assigneeId,
          `Task "${payload.taskTitle}" status changed from "${payload.oldStatus}" to "${payload.newStatus}".`
        );
      }
    );

    this.eventBus.subscribe<CommentAddedPayload>(
      "comment.added",
      (payload) => {
        // Only notify the assignee if they are different from the comment author
        if (!payload.assigneeId) return;
        if (payload.assigneeId === payload.authorId) return;
        this.createNotification(
          payload.assigneeId,
          `A new comment was added to task "${payload.taskTitle}": "${this.truncate(payload.body, 80)}"`
        );
      }
    );
  }

  // ── Create ────────────────────────────────────────────────────────────────

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

  // ── Read ──────────────────────────────────────────────────────────────────

  getNotification(id: string): Notification {
    const n = this.notifications.get(id);
    if (!n) throw new Error(`Notification "${id}" not found.`);
    return n;
  }

  /**
   * List notifications, optionally filtered to a specific user.
   * Results are sorted newest-first.
   */
  listNotifications(userId?: string): Notification[] {
    const all = [...this.notifications.values()];
    const filtered = userId ? all.filter((n) => n.userId === userId) : all;
    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // ── Mark as read ──────────────────────────────────────────────────────────

  markAsRead(id: string): Notification {
    const n = this.getNotification(id);
    n.read = true;
    return n;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private truncate(text: string, max: number): string {
    return text.length <= max ? text : text.slice(0, max - 1) + "…";
  }
}
