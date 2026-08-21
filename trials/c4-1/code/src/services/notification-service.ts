/**
 * Notification Service — creates and serves notifications.
 * Owns its own in-memory store.
 *
 * Events subscribed:
 *   task.assigned      → creates notification for assignee
 *   task.statusChanged → creates notification for assignee (if any)
 *   comment.added      → creates notification for task assignee
 *
 * The service subscribes to the event bus in its constructor.
 * The router must pass taskAssigneeId when calling handleCommentAdded so that
 * the notification service does not need to call the task service directly.
 * (In practice this is handled internally via the event payload enriched by
 *  the task service publishing assigneeId on task.statusChanged, and the
 *  comment.added event carrying the task assignee via the router enrichment.)
 */

import { randomUUID } from "crypto";
import { EventBus } from "../event-bus.js";

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO 8601
}

// ---------------------------------------------------------------------------
// Event payload types (mirror what publishers produce)
// ---------------------------------------------------------------------------

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
  /** Injected by router so notification service knows who to notify. */
  taskAssigneeId: string | null;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class NotificationNotFoundError extends Error {
  constructor(id: string) {
    super(`Notification not found: ${id}`);
    this.name = "NotificationNotFoundError";
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class NotificationService {
  /** Service-owned store — no other service may access this directly. */
  private store: Map<string, Notification> = new Map();

  constructor(bus: EventBus) {
    bus.subscribe("task.assigned", (payload) =>
      this.onTaskAssigned(payload as TaskAssignedPayload)
    );
    bus.subscribe("task.statusChanged", (payload) =>
      this.onTaskStatusChanged(payload as TaskStatusChangedPayload)
    );
    bus.subscribe("comment.added", (payload) =>
      this.onCommentAdded(payload as CommentAddedPayload)
    );
  }

  // -------------------------------------------------------------------------
  // Event handlers
  // -------------------------------------------------------------------------

  private onTaskAssigned(payload: TaskAssignedPayload): void {
    this.createNotification(
      payload.assigneeId,
      `You have been assigned to task "${payload.taskTitle}".`
    );
  }

  private onTaskStatusChanged(payload: TaskStatusChangedPayload): void {
    if (!payload.assigneeId) return; // no assignee → nobody to notify
    this.createNotification(
      payload.assigneeId,
      `Task "${payload.taskTitle}" status changed from "${payload.oldStatus}" to "${payload.newStatus}".`
    );
  }

  private onCommentAdded(payload: CommentAddedPayload): void {
    if (!payload.taskAssigneeId) return; // unassigned task → nobody to notify
    // Don't notify someone who commented on their own task
    if (payload.taskAssigneeId === payload.authorId) return;
    this.createNotification(
      payload.taskAssigneeId,
      `${payload.authorName} commented on task "${payload.taskTitle}": check your tasks for updates.`
    );
  }

  // -------------------------------------------------------------------------
  // Internal helper
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Public operations
  // -------------------------------------------------------------------------

  getByUser(userId: string): Notification[] {
    return Array.from(this.store.values()).filter(
      (n) => n.userId === userId
    );
  }

  markAsRead(id: string): Notification {
    const notification = this.store.get(id);
    if (!notification) throw new NotificationNotFoundError(id);
    notification.read = true;
    this.store.set(id, notification);
    return notification;
  }
}

/** Singleton — importing this file registers subscriptions on the shared bus. */
import { eventBus } from "../event-bus.js";
export const notificationService = new NotificationService(eventBus);
