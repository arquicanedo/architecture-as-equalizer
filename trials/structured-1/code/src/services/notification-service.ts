/**
 * Notification Service — owns all notification data.
 * Subscribes to:
 *   - "task.assigned"      → notify the assignee
 *   - "task.statusChanged" → notify the assignee (if any)
 *   - "comment.added"      → notify the task's current assignee (if any)
 *
 * All data needed arrives in event payloads — no other services are imported
 * or called (ADR-001, ADR-002).
 */

import { randomUUID } from "crypto";
import { EventBus } from "../event-bus.js";
import { ApiError } from "../errors.js";
import {
  TaskAssignedPayload,
  TaskStatusChangedPayload,
} from "./task-service.js";
import { CommentAddedPayload } from "./comment-service.js";

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO 8601
}

export class NotificationService {
  private readonly store = new Map<string, Notification>();

  constructor(bus: EventBus) {
    // ── task.assigned ───────────────────────────────────────────────────────
    bus.subscribe("task.assigned", (raw) => {
      const p = raw as TaskAssignedPayload;
      this.createNotification(
        p.assigneeId,
        `You have been assigned to task "${p.taskTitle}" (id: ${p.taskId}).`
      );
    });

    // ── task.statusChanged ──────────────────────────────────────────────────
    bus.subscribe("task.statusChanged", (raw) => {
      const p = raw as TaskStatusChangedPayload;
      if (!p.assigneeId) return; // unassigned — no one to notify
      this.createNotification(
        p.assigneeId,
        `Task "${p.taskTitle}" status changed: "${p.oldStatus}" → "${p.newStatus}".`
      );
    });

    // ── comment.added ───────────────────────────────────────────────────────
    bus.subscribe("comment.added", (raw) => {
      const p = raw as CommentAddedPayload;
      if (!p.taskAssigneeId) return;             // no assignee to notify
      if (p.taskAssigneeId === p.authorId) return; // don't self-notify
      this.createNotification(
        p.taskAssigneeId,
        `${p.authorName} commented on task "${p.taskTitle}".`
      );
    });
  }

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

  getByUser(userId: string): Notification[] {
    return Array.from(this.store.values())
      .filter((n) => n.userId === userId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  markAsRead(id: string): Notification {
    const notification = this.store.get(id);
    if (!notification) throw new ApiError(`Notification not found: ${id}`, 404);
    const updated: Notification = { ...notification, read: true };
    this.store.set(id, updated);
    return updated;
  }
}
