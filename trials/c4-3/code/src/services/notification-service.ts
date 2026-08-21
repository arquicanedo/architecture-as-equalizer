/**
 * Notification Service — creates notifications from events.
 * Owns its own in-memory data store (Map<string, Notification>).
 *
 * Events subscribed:
 *   task.assigned      → creates notification for the assignee
 *   task.statusChanged → creates notification for the assignee (if any)
 *   comment.added      → creates notification for the task assignee (if any)
 *
 * Operations exposed: getByUser, markAsRead
 */

import { randomUUID } from "crypto";
import { EventBus } from "../event-bus.js";

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// ---- Typed event payloads ----

interface TaskAssignedPayload {
  taskId: string;
  taskTitle: string;
  assigneeId: string;
}

interface TaskStatusChangedPayload {
  taskId: string;
  taskTitle: string;
  assigneeId: string | null;
  oldStatus: string;
  newStatus: string;
}

interface CommentAddedPayload {
  commentId: string;
  taskId: string;
  taskTitle: string;
  authorId: string;
  authorName: string;
  /** The task's current assignee — resolved by the router before publishing */
  assigneeId?: string | null;
}

export class NotificationService {
  private store: Map<string, Notification> = new Map();

  constructor(eventBus: EventBus) {
    // Subscribe to all relevant events
    eventBus.subscribe("task.assigned", (payload) => {
      const { taskId, taskTitle, assigneeId } =
        payload as TaskAssignedPayload;
      this.createNotification(
        assigneeId,
        `You have been assigned to task "${taskTitle}" (${taskId}).`
      );
    });

    eventBus.subscribe("task.statusChanged", (payload) => {
      const { taskId, taskTitle, assigneeId, oldStatus, newStatus } =
        payload as TaskStatusChangedPayload;
      if (!assigneeId) return; // no one to notify
      this.createNotification(
        assigneeId,
        `Task "${taskTitle}" (${taskId}) status changed from "${oldStatus}" to "${newStatus}".`
      );
    });

    eventBus.subscribe("comment.added", (payload) => {
      const { taskTitle, authorName, assigneeId } =
        payload as CommentAddedPayload;
      if (!assigneeId) return; // task has no assignee, nothing to notify
      this.createNotification(
        assigneeId,
        `${authorName} commented on task "${taskTitle}".`
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
    return Array.from(this.store.values()).filter(
      (n) => n.userId === userId
    );
  }

  markAsRead(id: string): Notification {
    const notification = this.store.get(id);
    if (!notification) throw new Error(`Notification not found: ${id}`);
    notification.read = true;
    this.store.set(id, notification);
    return notification;
  }
}
