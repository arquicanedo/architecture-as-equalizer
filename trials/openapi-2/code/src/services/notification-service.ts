import { randomUUID } from "crypto";
import {
  eventBus,
  EVENT_TASK_ASSIGNED,
  EVENT_TASK_STATUS_CHANGED,
  EVENT_COMMENT_ADDED,
  TaskAssignedPayload,
  TaskStatusChangedPayload,
  CommentAddedPayload,
} from "../event-bus.js";

// ── Domain types ────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO 8601
}

// ── Service ─────────────────────────────────────────────────────────────────

export class NotificationService {
  /** Owned data store — no other service may access this. */
  private store: Map<string, Notification> = new Map();

  constructor() {
    this.registerSubscriptions();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  listByUser(userId: string): Notification[] {
    return Array.from(this.store.values()).filter(
      (n) => n.userId === userId
    );
  }

  getById(id: string): Notification | undefined {
    return this.store.get(id);
  }

  markAsRead(id: string): Notification | undefined {
    const existing = this.store.get(id);
    if (!existing) return undefined;

    const updated: Notification = { ...existing, read: true };
    this.store.set(id, updated);
    return updated;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private create(userId: string, message: string): Notification {
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

  /**
   * Wire up all event subscriptions. Called once in the constructor.
   * No other service is imported — all data arrives via event payloads.
   */
  private registerSubscriptions(): void {
    // task.assigned → notify the assignee
    eventBus.subscribe(EVENT_TASK_ASSIGNED, (raw) => {
      const payload = raw as TaskAssignedPayload;
      this.create(
        payload.assigneeId,
        `You have been assigned to task "${payload.taskTitle}".`
      );
    });

    // task.statusChanged → notify the assignee (if any)
    eventBus.subscribe(EVENT_TASK_STATUS_CHANGED, (raw) => {
      const payload = raw as TaskStatusChangedPayload;
      if (!payload.assigneeId) return; // No assignee — nobody to notify
      this.create(
        payload.assigneeId,
        `Task "${payload.taskTitle}" status changed from "${payload.oldStatus}" to "${payload.newStatus}".`
      );
    });

    // comment.added → notify the comment author (as an acknowledgement)
    eventBus.subscribe(EVENT_COMMENT_ADDED, (raw) => {
      const payload = raw as CommentAddedPayload;
      this.create(
        payload.authorId,
        `Your comment on task "${payload.taskTitle}" was posted successfully.`
      );
    });
  }
}
