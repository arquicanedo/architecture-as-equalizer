// ============================================================
// Notification Service
// Owns the in-memory notification store.
// Subscribes to Event Bus events; never imports other services.
// ============================================================

import { randomUUID } from 'crypto';
import { Notification, ServiceResult, ok, fail } from '../types.js';
import {
  eventBus,
  Events,
  TaskAssignedPayload,
  TaskStatusChangedPayload,
  CommentAddedPayload,
} from '../event-bus.js';

class NotificationService {
  private readonly store = new Map<string, Notification>();

  constructor() {
    this.registerSubscriptions();
  }

  // ---- Public API ------------------------------------------

  listForUser(userId: string): ServiceResult<Notification[]> {
    const notes = Array.from(this.store.values())
      .filter((n) => n.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    return ok(notes);
  }

  markRead(id: string): ServiceResult<Notification> {
    const note = this.store.get(id);
    if (!note) return fail(404, `Notification "${id}" not found`);

    const updated: Notification = { ...note, read: true };
    this.store.set(id, updated);
    return ok(updated);
  }

  // ---- Private helpers -------------------------------------

  private createNotification(userId: string, message: string): void {
    const note: Notification = {
      id: randomUUID(),
      userId,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.store.set(note.id, note);
  }

  // ---- Event Bus subscriptions -----------------------------

  private registerSubscriptions(): void {
    eventBus.subscribe(Events.TASK_ASSIGNED, (raw) => {
      const payload = raw as TaskAssignedPayload;
      this.createNotification(
        payload.assigneeId,
        `You have been assigned to task "${payload.taskTitle}" (${payload.taskId}).`,
      );
    });

    eventBus.subscribe(Events.TASK_STATUS_CHANGED, (raw) => {
      const payload = raw as TaskStatusChangedPayload;
      if (!payload.assigneeId) return;
      this.createNotification(
        payload.assigneeId,
        `Task "${payload.taskTitle}" status changed: "${payload.oldStatus}" → "${payload.newStatus}".`,
      );
    });

    eventBus.subscribe(Events.COMMENT_ADDED, (raw) => {
      const payload = raw as CommentAddedPayload;
      this.createNotification(
        payload.authorId,
        `Your comment on task "${payload.taskTitle}" was recorded (comment id: ${payload.commentId}).`,
      );
    });
  }
}

export const notificationService = new NotificationService();
